import { requireSupabase } from "./supabaseClient.js";
import { WISP_RPCS, isUuid } from "./config.js";

// STUN cannot relay media through every strict network. Production calling
// should add an authenticated TURN service without exposing TURN secrets here.
const ICE_SERVERS = Object.freeze([
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]);
const SIGNAL_EVENTS = Object.freeze(["offer", "answer", "answer-selected", "ice-candidate", "end"]);
const DISCONNECT_GRACE_MS = 12_000;
const RING_TIMEOUT_MS = 90_000;
const outstandingCallIds = new Map();

function trackedCalls(chatId) {
  let calls = outstandingCallIds.get(chatId);
  if (!calls) {
    calls = new Set();
    outstandingCallIds.set(chatId, calls);
  }
  return calls;
}

function trackCall(chatId, callId) {
  if (isUuid(callId)) trackedCalls(chatId).add(callId);
}

function forgetCall(chatId, callId) {
  const calls = outstandingCallIds.get(chatId);
  calls?.delete(callId);
  if (calls?.size === 0) outstandingCallIds.delete(chatId);
}

function oneRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function validDescription(value, expectedType) {
  return value
    && typeof value === "object"
    && value.type === expectedType
    && typeof value.sdp === "string"
    && value.sdp.length > 0
    && value.sdp.length <= 100_000;
}

function validCandidate(value) {
  if (!value || typeof value !== "object") return false;
  try { return JSON.stringify(value).length <= 8_000; } catch { return false; }
}

function validInstanceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,128}$/.test(value);
}

export class CallSession {
  constructor(chatId, handlers = {}) {
    if (!isUuid(chatId)) throw new Error("That conversation identifier is invalid.");
    this.client = requireSupabase();
    this.chatId = chatId;
    this.handlers = handlers;
    this.pc = null;
    this.localStream = null;
    this.callId = null;
    this.callType = null;
    this.myUserId = null;
    this.accessToken = "";
    this.pendingOffer = null;
    this.pendingIce = [];
    this.pendingLocalIce = [];
    this.offerSent = false;
    this.remoteInstanceId = "";
    this.isIncomingAnswerer = false;
    this.answerSelected = false;
    this.endRequests = new Map();
    this.pendingEndSignals = new Set();
    this.destroyed = false;
    this.subscribed = false;
    this.failureNotified = false;
    this.starting = false;
    this.accepting = false;
    this.deferredOffer = null;
    this.operationVersion = 0;
    this.disconnectTimer = 0;
    this.outgoingRingTimer = 0;
    this.incomingRingTimer = 0;
    this.recipientClaimRelease = null;
    this.recipientClaimTask = null;
    this.instanceId = globalThis.crypto?.randomUUID?.()
      || `wisp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { data: authListener } = this.client.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id;
      if (!nextSession || (this.myUserId && nextUserId !== this.myUserId)) {
        // Never leave a camera or microphone active after logout or an account
        // switch in another tab.
        void this.destroy({ keepalive: true }).catch((error) => {
          console.warn("Wisp could not confirm call cleanup after sign-out.", error);
        });
        this.accessToken = "";
        return;
      }
      this.accessToken = String(nextSession.access_token || "");
    });
    this.authSubscription = authListener.subscription;
    this.channel = this.client.channel(`wisp-call:${chatId}`, {
      config: { private: true, broadcast: { ack: true, self: false } },
    });

    for (const event of SIGNAL_EVENTS) {
      this.channel.on("broadcast", { event }, ({ payload }) => {
        void this._handleSignal(event, payload).catch((error) => this._fail(error));
      });
    }
    this.ready = this._subscribe();
    this.ready.catch((error) => this._fail(error));
  }

  async _subscribe() {
    const { data, error } = await this.client.auth.getSession();
    const token = String(data?.session?.access_token || "");
    if (error || !token || data.session.user?.is_anonymous) {
      throw error || new Error("A permanent signed-in account is required for calls.");
    }
    if (this.destroyed) throw new Error("This call session has closed.");
    this.myUserId = data.session.user.id;
    this.accessToken = token;
    await this.client.realtime.setAuth(token);
    if (this.destroyed) throw new Error("This call session has closed.");

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("The private call channel timed out.")), 10_000);
      this.channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(timeout);
          this.subscribed = true;
          resolve();
        } else if (!this.destroyed && ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          window.clearTimeout(timeout);
          reject(new Error("The private call channel could not open."));
        }
      });
    });
  }

  async _ensureUserId() {
    await this.ready;
    if (!this.myUserId) throw new Error("A signed-in user is required.");
    return this.myUserId;
  }

  async _send(event, payload) {
    if (!SIGNAL_EVENTS.includes(event)) throw new Error("Unsupported call signal.");
    await this.ready;
    if (this.destroyed) throw new Error("This call session has closed.");
    const result = await this.channel.send({ type: "broadcast", event, payload });
    if (result !== "ok") throw new Error(`Call signaling failed: ${result || "unknown error"}.`);
  }

  _queueEndSignal(callId) {
    if (!this.subscribed || this.destroyed || !isUuid(callId)) return Promise.resolve();
    let request;
    try {
      request = Promise.resolve(this.channel.send({
        type: "broadcast",
        event: "end",
        payload: { callId, fromUserId: this.myUserId, fromInstanceId: this.instanceId },
      })).then((result) => {
        if (result !== "ok") throw new Error(`Call signaling failed: ${result || "unknown error"}.`);
      });
    } catch (error) {
      request = Promise.reject(error);
    }
    this.pendingEndSignals.add(request);
    void request.finally(() => this.pendingEndSignals.delete(request)).catch(() => {});
    return request;
  }

  _fail(error) {
    if (this.destroyed || this.failureNotified) return;
    this.failureNotified = true;
    console.error("Wisp call signaling failed.", error);
    if (this._abandonUnselectedAnswerer("failed")) return;
    const { activeCallId, callIds } = this._snapshotCallState();
    const endSignal = this._queueEndSignal(activeCallId);
    // Stop private media before network cleanup. A slow or offline request
    // must never leave the camera or microphone active.
    this._teardownLocal();
    void this._finishCall({ activeCallId, callIds, endSignal }).catch((releaseError) => {
      console.warn("Wisp could not release the failed call immediately.", releaseError);
    });
    this.handlers.onStateChange?.("failed");
  }

  _clearDisconnectTimer() {
    if (!this.disconnectTimer) return;
    window.clearTimeout(this.disconnectTimer);
    this.disconnectTimer = 0;
  }

  _clearRingTimers() {
    window.clearTimeout(this.outgoingRingTimer);
    window.clearTimeout(this.incomingRingTimer);
    this.outgoingRingTimer = 0;
    this.incomingRingTimer = 0;
  }

  _assertOperation(operationVersion, pc = this.pc) {
    if (this.destroyed || operationVersion !== this.operationVersion || !pc || this.pc !== pc) {
      throw new Error("This call was cancelled before it could connect.");
    }
  }

  _abandonUnselectedAnswerer(state = "") {
    if (!this.isIncomingAnswerer || this.answerSelected) return false;
    // Until the caller confirms which answering device won, this device does
    // not own the shared server call and must never end it globally.
    const unselectedCallId = this.callId || this.pendingOffer?.callId;
    if (isUuid(unselectedCallId)) forgetCall(this.chatId, unselectedCallId);
    this._teardownLocal();
    if (state) this.handlers.onStateChange?.(state);
    return true;
  }

  _createPeerConnection() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON?.() || event.candidate;
      if (!this.callId || !this.offerSent) {
        if (this.pendingLocalIce.length < 64) this.pendingLocalIce.push(candidate);
        return;
      }
      void this._send("ice-candidate", {
        callId: this.callId,
        candidate,
        fromUserId: this.myUserId,
        fromInstanceId: this.instanceId,
      }).catch((error) => this._fail(error));
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.handlers.onRemoteStream?.(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this._clearDisconnectTimer();
        this._clearRingTimers();
        this.handlers.onStateChange?.("connected");
      } else if (pc.connectionState === "failed") {
        this._clearDisconnectTimer();
        this._fail(new Error("The peer connection failed."));
      } else if (pc.connectionState === "closed") {
        this._clearDisconnectTimer();
        if (this._abandonUnselectedAnswerer("ended")) return;
        const snapshot = this._snapshotCallState();
        const endSignal = this._queueEndSignal(snapshot.activeCallId);
        this._teardownLocal();
        void this._finishCall({ ...snapshot, endSignal }).catch((error) => {
          console.warn("Wisp could not confirm the closed call ended.", error);
        });
        this.handlers.onStateChange?.("ended");
      } else if (pc.connectionState === "disconnected" && !this.disconnectTimer) {
        // WebRTC often reports a short disconnect while the device changes
        // networks. Give ICE a chance to recover before ending a good call.
        this.disconnectTimer = window.setTimeout(() => {
          this.disconnectTimer = 0;
          if (!this.destroyed && this.pc === pc && pc.connectionState === "disconnected") {
            this._fail(new Error("The peer connection did not recover."));
          }
        }, DISCONNECT_GRACE_MS);
      }
    };
    return pc;
  }

  async _getLocalStream(callType, operationVersion, pc) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access calls.");
    this._assertOperation(operationVersion, pc);
    const constraints = callType === "video" ? { audio: true, video: true } : { audio: true, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (this.destroyed || operationVersion !== this.operationVersion || this.pc !== pc) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("This call was cancelled before media access completed.");
    }
    this.localStream = stream;
    return stream;
  }

  async _flushPendingIce() {
    if (!this.pc?.remoteDescription) return;
    const queued = this.pendingIce.splice(0);
    for (const entry of queued) {
      if (this.remoteInstanceId && entry.fromInstanceId !== this.remoteInstanceId) continue;
      await this.pc.addIceCandidate(entry.candidate).catch((error) => {
        console.warn("Wisp ignored an unusable ICE candidate.", error);
      });
    }
  }

  async _flushPendingLocalIce() {
    if (!isUuid(this.callId) || !this.offerSent) return;
    const callId = this.callId;
    const queued = this.pendingLocalIce.splice(0);
    for (const candidate of queued) {
      await this._send("ice-candidate", {
        callId,
        candidate,
        fromUserId: this.myUserId,
        fromInstanceId: this.instanceId,
      });
      if (this.callId !== callId) break;
    }
  }

  async _claimIncomingCall(callId) {
    const lockManager = globalThis.navigator?.locks;
    if (!lockManager?.request || !isUuid(callId)) return true;

    let resolveClaim;
    let releaseHold;
    let claimSettled = false;
    const claimResult = new Promise((resolve) => { resolveClaim = resolve; });
    const holdClaim = new Promise((resolve) => { releaseHold = resolve; });
    const settleClaim = (value) => {
      if (claimSettled) return;
      claimSettled = true;
      resolveClaim(value);
    };

    const task = Promise.resolve().then(() => lockManager.request(
      `kiddosprout-wisp-recipient:${callId}`,
      { mode: "exclusive", ifAvailable: true },
      async (lock) => {
        if (!lock || this.destroyed || this.pendingOffer?.callId !== callId) {
          settleClaim(false);
          return;
        }
        let released = false;
        this.recipientClaimRelease = () => {
          if (released) return;
          released = true;
          releaseHold();
        };
        settleClaim(true);
        await holdClaim;
      },
    )).catch((error) => {
      console.warn("Wisp could not reserve this recipient tab for the call.", error);
      settleClaim(false);
    });
    this.recipientClaimTask = task;

    const claimed = await claimResult;
    if (!claimed) releaseHold();
    return claimed;
  }

  /** Start an outgoing voice or video call. */
  async startCall(callType) {
    if (!['voice', 'video'].includes(callType)) throw new Error("Unsupported call type.");
    if (this.starting || this.callId || this.pendingOffer) throw new Error("A call is already in progress.");
    this.starting = true;
    this.failureNotified = false;
    const operationVersion = ++this.operationVersion;

    try {
      await this._ensureUserId();
      if (this.destroyed || operationVersion !== this.operationVersion || this.callId || this.pendingOffer) {
        throw new Error("A call is already in progress or was cancelled.");
      }
      await this._releaseCallRecords();
      if (this.destroyed || operationVersion !== this.operationVersion) {
        throw new Error("This call was cancelled before it could start.");
      }
      this.callType = callType;
      const pc = this._createPeerConnection();
      this.pc = pc;
      const stream = await this._getLocalStream(callType, operationVersion, pc);
      this._assertOperation(operationVersion, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      this._assertOperation(operationVersion, pc);
      await pc.setLocalDescription(offer);
      this._assertOperation(operationVersion, pc);

      const { data, error } = await this.client
        .rpc(WISP_RPCS.startCall, { p_chat_id: this.chatId, p_call_type: callType })
        .single();
      if (error) throw error;
      const row = oneRow(data);
      if (!isUuid(row?.call_id)) throw new Error("The call service returned an invalid identifier.");
      this.callId = row.call_id;
      trackCall(this.chatId, this.callId);
      this._assertOperation(operationVersion, pc);
      const expectedCallId = this.callId;
      this.outgoingRingTimer = window.setTimeout(() => {
        this.outgoingRingTimer = 0;
        if (this.destroyed || this.callId !== expectedCallId || pc.remoteDescription) return;
        const snapshot = this._snapshotCallState();
        const endSignal = this._queueEndSignal(snapshot.activeCallId);
        this._teardownLocal();
        void this._finishCall({ ...snapshot, endSignal }).catch((timeoutError) => {
          console.warn("Wisp could not confirm the unanswered call ended.", timeoutError);
        });
        this.handlers.onStateChange?.("unanswered");
      }, RING_TIMEOUT_MS);
      await this._send("offer", {
        sdp: offer,
        callType,
        callId: this.callId,
        fromUserId: this.myUserId,
        fromInstanceId: this.instanceId,
      });
      this.offerSent = true;
      await this._flushPendingLocalIce();
      this.handlers.onStateChange?.("calling");
      return stream;
    } catch (error) {
      const { activeCallId, callIds } = this._snapshotCallState();
      const endSignal = this._queueEndSignal(activeCallId);
      this._teardownLocal();
      if (activeCallId || callIds.size) {
        await this._finishCall({
          keepalive: this.destroyed,
          activeCallId,
          callIds,
          endSignal,
        }).catch((releaseError) => {
          console.warn("Wisp could not release the failed outgoing call immediately.", releaseError);
        });
      }
      throw error;
    } finally {
      this.starting = false;
      const deferredOffer = this.deferredOffer;
      this.deferredOffer = null;
      if (!this.destroyed && !this.callId && !this.pendingOffer && deferredOffer) {
        await this._onOffer(deferredOffer);
      }
    }
  }

  async _handleSignal(event, payload) {
    if (this.destroyed || !payload || typeof payload !== "object") return;
    await this._ensureUserId();
    if (this.destroyed) return;
    if (payload.fromInstanceId === this.instanceId) return;
    if (payload.fromUserId === this.myUserId) {
      const duplicateIncomingCallId = this.pendingOffer?.callId;
      if (["answer", "end"].includes(event)
          && isUuid(duplicateIncomingCallId)
          && payload.callId === duplicateIncomingCallId) {
        // Another tab for this same account handled the incoming call. Dismiss
        // this tab without ending the shared server call it may have accepted.
        forgetCall(this.chatId, duplicateIncomingCallId);
        this._teardownLocal();
        this.handlers.onStateChange?.("superseded");
      }
      return;
    }
    if (event !== "offer" && payload.callId && this.callId && payload.callId !== this.callId) return;
    if (event === "offer") await this._onOffer(payload);
    if (event === "answer") await this._onAnswer(payload);
    if (event === "answer-selected") await this._onAnswerSelected(payload);
    if (event === "ice-candidate") await this._onRemoteIce(payload);
    if (event === "end") await this._onRemoteEnd(payload);
  }

  async _onOffer(payload) {
    if (!isUuid(payload.callId) || !isUuid(payload.fromUserId) || !validInstanceId(payload.fromInstanceId)) return;
    if (!['voice', 'video'].includes(payload.callType) || !validDescription(payload.sdp, "offer")) return;
    if (this.starting) {
      // Simultaneous callers can each see the other's offer before the server
      // picks a winner. Keep one offer so the losing outgoing attempt can
      // become the incoming call instead of deadlocking both sides.
      this.deferredOffer ||= payload;
      return;
    }
    if (this.accepting || this.callId || this.pendingOffer) return;
    this.pendingOffer = payload;
    trackCall(this.chatId, payload.callId);
    this.callType = payload.callType;
    window.clearTimeout(this.incomingRingTimer);
    const expectedCallId = payload.callId;
    this.incomingRingTimer = window.setTimeout(() => {
      this.incomingRingTimer = 0;
      if (this.destroyed || this.pendingOffer?.callId !== expectedCallId) return;
      // Only the caller owns the unanswered-call timeout. A duplicate recipient
      // tab must never end a call that another tab for the same account accepted.
      forgetCall(this.chatId, expectedCallId);
      this._teardownLocal();
      this.handlers.onStateChange?.("ended");
    }, RING_TIMEOUT_MS);
    this.handlers.onStateChange?.("ringing");
    this.handlers.onIncomingCall?.({ callType: payload.callType, fromUserId: payload.fromUserId });
  }

  /** Accept the most recent incoming offer. Returns the local media stream. */
  async acceptCall() {
    if (this.accepting || !this.pendingOffer) throw new Error("No pending call to accept.");
    this.accepting = true;
    this.failureNotified = false;
    const { sdp, callType, callId } = this.pendingOffer;
    const operationVersion = ++this.operationVersion;
    this.remoteInstanceId = String(this.pendingOffer.fromInstanceId || "");
    this.isIncomingAnswerer = true;
    this.answerSelected = false;

    try {
      await this._ensureUserId();
      if (this.destroyed || operationVersion !== this.operationVersion) {
        throw new Error("This call session has closed.");
      }
      if (!await this._claimIncomingCall(callId)) {
        // A sibling tab already owns this incoming call. Remove only this
        // tab's ring; the winning tab remains responsible for the server row.
        forgetCall(this.chatId, callId);
        this.pendingOffer = null;
        this.handlers.onStateChange?.("superseded");
        return null;
      }
      this.callType = callType;
      this.callId = callId;
      window.clearTimeout(this.incomingRingTimer);
      this.incomingRingTimer = 0;
      const pc = this._createPeerConnection();
      this.pc = pc;

      const { data: joined, error } = await this.client.rpc(WISP_RPCS.joinCall, { p_call_id: callId });
      if (error || joined !== true) throw error || new Error("The call could not be joined.");
      this._assertOperation(operationVersion, pc);
      const stream = await this._getLocalStream(callType, operationVersion, pc);
      this._assertOperation(operationVersion, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      this._assertOperation(operationVersion, pc);
      await this._flushPendingIce();
      this._assertOperation(operationVersion, pc);
      const answer = await pc.createAnswer();
      this._assertOperation(operationVersion, pc);
      await pc.setLocalDescription(answer);
      this._assertOperation(operationVersion, pc);
      await this._send("answer", {
        sdp: answer,
        callId: this.callId,
        fromUserId: this.myUserId,
        fromInstanceId: this.instanceId,
      });
      // Candidates can arrive while setLocalDescription() is gathering them.
      // Do not publish them before the answer (the remote peer would not yet
      // know what to attach them to), but always release them once the answer
      // has been acknowledged by the private signaling channel.
      this.offerSent = true;
      await this._flushPendingLocalIce();
      this.pendingOffer = null;
      this.handlers.onStateChange?.("connected");
      return stream;
    } catch (callError) {
      if (this._abandonUnselectedAnswerer("failed")) throw callError;
      const { activeCallId, callIds } = this._snapshotCallState();
      const endSignal = this._queueEndSignal(activeCallId);
      this._teardownLocal();
      await this._finishCall({
        keepalive: this.destroyed,
        activeCallId,
        callIds,
        endSignal,
      }).catch((releaseError) => {
        console.warn("Wisp could not release the failed incoming call immediately.", releaseError);
      });
      throw callError;
    } finally {
      this.accepting = false;
    }
  }

  async declineCall() {
    const callId = this.pendingOffer?.callId;
    this.callId = isUuid(callId) ? callId : this.callId;
    this.pendingOffer = null;
    const snapshot = this._snapshotCallState();
    const endSignal = this._queueEndSignal(snapshot.activeCallId);
    this._teardownLocal();
    this.handlers.onStateChange?.("ended");
    try {
      await this._finishCall({ ...snapshot, endSignal });
    } catch (error) {
      console.warn("Wisp could not confirm the declined call ended.", error);
    }
  }

  async _onAnswer(payload) {
    if (!this.pc || !validDescription(payload.sdp, "answer")) return;
    const activeCallId = this.callId || this.pendingOffer?.callId;
    if (!isUuid(payload.fromUserId)
        || !validInstanceId(payload.fromInstanceId)
        || !isUuid(activeCallId)
        || payload.callId !== activeCallId) return;
    if (this.remoteInstanceId && payload.fromInstanceId !== this.remoteInstanceId) return;
    // The per-recipient tab lock should yield exactly one answer. Treat a late
    // duplicate as harmless instead of applying it in a stable signaling state
    // and tearing down the good call.
    if (this.pc.signalingState && this.pc.signalingState !== "have-local-offer") return;
    this.remoteInstanceId = payload.fromInstanceId;
    window.clearTimeout(this.outgoingRingTimer);
    this.outgoingRingTimer = 0;
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    await this._flushPendingIce();
    await this._send("answer-selected", {
      callId: activeCallId,
      selectedInstanceId: this.remoteInstanceId,
      fromUserId: this.myUserId,
      fromInstanceId: this.instanceId,
    });
  }

  async _onAnswerSelected(payload) {
    const activeCallId = this.callId || this.pendingOffer?.callId;
    if (!isUuid(payload.fromUserId)
        || !validInstanceId(payload.fromInstanceId)
        || !validInstanceId(payload.selectedInstanceId)
        || !isUuid(activeCallId)
        || payload.callId !== activeCallId
        || (this.remoteInstanceId && payload.fromInstanceId !== this.remoteInstanceId)) return;

    if (payload.selectedInstanceId === this.instanceId) {
      this.answerSelected = true;
      return;
    }

    // Another browser/device answered first. Leave only this local attempt;
    // ending the shared database row would also terminate the winning device.
    forgetCall(this.chatId, activeCallId);
    this._teardownLocal();
    this.handlers.onStateChange?.("superseded");
  }

  async _onRemoteIce(payload) {
    if (!validCandidate(payload.candidate)
        || !isUuid(payload.fromUserId)
        || !validInstanceId(payload.fromInstanceId)) return;
    const activeCallId = this.callId || this.pendingOffer?.callId;
    if (!isUuid(payload.callId) || !isUuid(activeCallId) || payload.callId !== activeCallId) return;
    if (this.remoteInstanceId && payload.fromInstanceId !== this.remoteInstanceId) return;
    if (!this.pc?.remoteDescription) {
      if (this.pendingIce.length < 64) {
        this.pendingIce.push({ candidate: payload.candidate, fromInstanceId: payload.fromInstanceId });
      }
      return;
    }
    await this.pc.addIceCandidate(payload.candidate).catch((error) => {
      console.warn("Wisp ignored an unusable ICE candidate.", error);
    });
  }

  async _onRemoteEnd(payload) {
    const activeCallId = this.callId || this.pendingOffer?.callId;
    if (!isUuid(payload.callId) || !isUuid(activeCallId) || payload.callId !== activeCallId) return;
    if (this.remoteInstanceId && payload.fromInstanceId !== this.remoteInstanceId) return;
    const snapshot = this._snapshotCallState();
    this._teardownLocal();
    this.handlers.onStateChange?.("ended");
    try {
      await this._releaseCallRecords({ callIds: snapshot.callIds });
    } catch (error) {
      console.warn("Wisp could not confirm the remote call ended.", error);
    }
  }

  async _endCallRecordWithKeepalive(callId) {
    const url = String(this.client.supabaseUrl || "").replace(/\/+$/, "");
    const key = String(this.client.supabaseKey || "");
    if (!url || !key || !this.accessToken) {
      throw new Error("The call service is not available for background cleanup.");
    }

    const response = await window.fetch(`${url}/rest/v1/rpc/${encodeURIComponent(WISP_RPCS.endCall)}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_call_id: callId }),
      keepalive: true,
    });
    if (response.ok) return true;

    let details = null;
    try { details = await response.json(); } catch { /* A closed page may not expose a response body. */ }
    throw new Error(details?.message || `Call cleanup failed with status ${response.status}.`);
  }

  async _endCallRecord(callId, { keepalive = false } = {}) {
    if (!isUuid(callId)) return true;
    const pending = this.endRequests.get(callId);
    if (pending) return pending;

    const request = (async () => {
      try {
        if (keepalive) return await this._endCallRecordWithKeepalive(callId);
        const { data, error } = await this.client.rpc(WISP_RPCS.endCall, { p_call_id: callId });
        if (error || data !== true) throw error || new Error("The call history could not be updated.");
        return true;
      } catch (error) {
        if (!keepalive) {
          try { return await this._endCallRecordWithKeepalive(callId); } catch { /* Report the original RPC error. */ }
        }
        throw error;
      }
    })();
    this.endRequests.set(callId, request);

    try {
      await request;
      forgetCall(this.chatId, callId);
      return true;
    } finally {
      if (this.endRequests.get(callId) === request) this.endRequests.delete(callId);
    }
  }

  _snapshotCallState() {
    const callIds = new Set(outstandingCallIds.get(this.chatId) || []);
    if (isUuid(this.callId)) callIds.add(this.callId);
    if (isUuid(this.pendingOffer?.callId)) callIds.add(this.pendingOffer.callId);
    const activeCallId = isUuid(this.callId) ? this.callId : this.pendingOffer?.callId;
    return { activeCallId: isUuid(activeCallId) ? activeCallId : null, callIds };
  }

  async _releaseCallRecords({ keepalive = false, callIds: suppliedCallIds = null } = {}) {
    const callIds = suppliedCallIds ? new Set(suppliedCallIds) : this._snapshotCallState().callIds;
    if (!callIds.size) return true;

    const results = await Promise.allSettled(
      [...callIds].map((callId) => this._endCallRecord(callId, { keepalive })),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    return true;
  }

  async _finishCall({
    notifyPeer = false,
    keepalive = false,
    activeCallId = undefined,
    callIds = undefined,
    endSignal = undefined,
  } = {}) {
    const snapshot = this._snapshotCallState();
    const callId = activeCallId === undefined ? snapshot.activeCallId : activeCallId;
    const idsToRelease = callIds === undefined ? snapshot.callIds : callIds;
    const signalPromise = endSignal !== undefined
      ? endSignal
      : notifyPeer && isUuid(callId) && !this.destroyed
        ? this._send("end", {
          callId,
          fromUserId: this.myUserId,
          fromInstanceId: this.instanceId,
        })
        : Promise.resolve();
    const [signalResult, releaseResult] = await Promise.allSettled([
      signalPromise,
      this._releaseCallRecords({ keepalive, callIds: idsToRelease }),
    ]);
    if (signalResult.status === "rejected") {
      console.warn("Wisp could not deliver the call-end signal.", signalResult.reason);
    }
    if (releaseResult.status === "rejected") throw releaseResult.reason;
    return true;
  }

  _teardownLocal() {
    this.operationVersion += 1;
    const releaseRecipientClaim = this.recipientClaimRelease;
    this.recipientClaimRelease = null;
    releaseRecipientClaim?.();
    this._clearDisconnectTimer();
    this._clearRingTimers();
    this.localStream?.getTracks().forEach((track) => track.stop());
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
    }
    this.localStream = null;
    this.pc = null;
    this.pendingOffer = null;
    this.pendingIce = [];
    this.pendingLocalIce = [];
    this.offerSent = false;
    this.remoteInstanceId = "";
    this.isIncomingAnswerer = false;
    this.answerSelected = false;
    this.callId = null;
    this.callType = null;
  }

  async hangUp() {
    if (this._abandonUnselectedAnswerer("ended")) return;
    const snapshot = this._snapshotCallState();
    const endSignal = this._queueEndSignal(snapshot.activeCallId);
    this._teardownLocal();
    this.handlers.onStateChange?.("ended");
    try {
      await this._finishCall({ ...snapshot, endSignal });
    } catch (error) {
      console.warn("Wisp could not confirm the call ended.", error);
    }
  }

  toggleMute() {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    if (!audioTrack) return false;
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled;
  }

  toggleCamera() {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return false;
    videoTrack.enabled = !videoTrack.enabled;
    return !videoTrack.enabled;
  }

  async destroy({ keepalive = false } = {}) {
    if (this.destroyed) return;
    const passiveIncomingCallId = !this.callId && this.pendingOffer?.callId;
    if (isUuid(passiveIncomingCallId)) {
      // Merely closing one of several recipient tabs is not a decline. Another
      // tab for this account may already be answering the same ringing call,
      // so remove only this tab's bookkeeping and leave global call ownership
      // to an explicit decline, the caller timeout, or the connected peer.
      forgetCall(this.chatId, passiveIncomingCallId);
      this.pendingOffer = null;
    }
    this._abandonUnselectedAnswerer();
    const snapshot = this._snapshotCallState();
    const activeCallId = snapshot.activeCallId;
    // If signaling is already connected, enqueue the exact end event before
    // closing the channel. This prevents the other tab from ringing forever
    // when somebody navigates away or signs out.
    const endSignal = this.subscribed && isUuid(activeCallId)
      ? this.channel.send({
        type: "broadcast",
        event: "end",
        payload: {
          callId: activeCallId,
          fromUserId: this.myUserId,
          fromInstanceId: this.instanceId,
        },
      })
      : Promise.resolve();
    // Stop accepting signals before taking the cleanup snapshot so a late
    // offer cannot create an orphaned call while destroy is awaiting I/O.
    this.destroyed = true;
    this.subscribed = false;
    this.authSubscription?.unsubscribe();
    const queuedEndSignals = [...this.pendingEndSignals, Promise.resolve(endSignal)];
    const channelRemoval = Promise.allSettled(queuedEndSignals)
      .then(() => this.client.removeChannel(this.channel).catch(() => {}));
    const releasePromise = this._releaseCallRecords({ keepalive, callIds: snapshot.callIds });
    this._teardownLocal();
    try {
      await releasePromise;
    } finally {
      await channelRemoval;
    }
  }
}

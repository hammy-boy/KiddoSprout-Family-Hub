import { requireSupabase } from "./supabaseClient.js";
import { WISP_RPCS, isUuid } from "./config.js";

// STUN cannot relay media through every strict network. Production calling
// should add an authenticated TURN service without exposing TURN secrets here.
const ICE_SERVERS = Object.freeze([
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]);
const SIGNAL_EVENTS = Object.freeze(["offer", "answer", "ice-candidate", "end"]);
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
    this.endRequests = new Map();
    this.destroyed = false;
    this.failureNotified = false;
    const { data: authListener } = this.client.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user?.id;
      if (!nextSession || (this.myUserId && nextUserId !== this.myUserId)) {
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
    this.myUserId = data.session.user.id;
    this.accessToken = token;
    await this.client.realtime.setAuth(token);

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("The private call channel timed out.")), 10_000);
      this.channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(timeout);
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

  _fail(error) {
    if (this.destroyed || this.failureNotified) return;
    this.failureNotified = true;
    console.error("Wisp call signaling failed.", error);
    void this._releaseCallRecords().catch((releaseError) => {
      console.warn("Wisp could not release the failed call immediately.", releaseError);
    });
    this.handlers.onStateChange?.("failed");
  }

  _createPeerConnection() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (!event.candidate || !this.callId) return;
      void this._send("ice-candidate", {
        callId: this.callId,
        candidate: event.candidate.toJSON?.() || event.candidate,
        fromUserId: this.myUserId,
      }).catch((error) => this._fail(error));
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.handlers.onRemoteStream?.(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") this.handlers.onStateChange?.("connected");
      if (pc.connectionState === "failed") this._fail(new Error("The peer connection failed."));
      if (["disconnected", "closed"].includes(pc.connectionState)) {
        this.handlers.onStateChange?.("ended");
      }
    };
    return pc;
  }

  async _getLocalStream(callType) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access calls.");
    const constraints = callType === "video" ? { audio: true, video: true } : { audio: true, video: false };
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  async _flushPendingIce() {
    if (!this.pc?.remoteDescription) return;
    const queued = this.pendingIce.splice(0);
    for (const candidate of queued) {
      await this.pc.addIceCandidate(candidate).catch((error) => {
        console.warn("Wisp ignored an unusable ICE candidate.", error);
      });
    }
  }

  /** Start an outgoing voice or video call. */
  async startCall(callType) {
    if (!['voice', 'video'].includes(callType)) throw new Error("Unsupported call type.");
    await this._ensureUserId();
    if (this.callId || this.pendingOffer) throw new Error("A call is already in progress.");
    await this._releaseCallRecords();
    this.callType = callType;
    this.pc = this._createPeerConnection();

    try {
      const stream = await this._getLocalStream(callType);
      stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const { data, error } = await this.client
        .rpc(WISP_RPCS.startCall, { p_chat_id: this.chatId, p_call_type: callType })
        .single();
      if (error) throw error;
      const row = oneRow(data);
      if (!isUuid(row?.call_id)) throw new Error("The call service returned an invalid identifier.");
      this.callId = row.call_id;
      trackCall(this.chatId, this.callId);
      if (this.destroyed) {
        await this._releaseCallRecords({ keepalive: true });
        throw new Error("The call page closed before the call could start.");
      }
      await this._send("offer", {
        sdp: offer,
        callType,
        callId: this.callId,
        fromUserId: this.myUserId,
      });
      this.handlers.onStateChange?.("calling");
      return stream;
    } catch (error) {
      if (this.callId) {
        await this._releaseCallRecords().catch((releaseError) => {
          console.warn("Wisp could not release the failed outgoing call immediately.", releaseError);
        });
      }
      this._teardownLocal();
      throw error;
    }
  }

  async _handleSignal(event, payload) {
    if (!payload || typeof payload !== "object") return;
    await this._ensureUserId();
    if (payload.fromUserId === this.myUserId) return;
    if (event !== "offer" && payload.callId && this.callId && payload.callId !== this.callId) return;
    if (event === "offer") await this._onOffer(payload);
    if (event === "answer") await this._onAnswer(payload);
    if (event === "ice-candidate") await this._onRemoteIce(payload);
    if (event === "end") await this._onRemoteEnd(payload);
  }

  async _onOffer(payload) {
    if (!isUuid(payload.callId) || !isUuid(payload.fromUserId)) return;
    if (!['voice', 'video'].includes(payload.callType) || !validDescription(payload.sdp, "offer")) return;
    if (this.callId || this.pendingOffer) return;
    this.pendingOffer = payload;
    trackCall(this.chatId, payload.callId);
    this.callType = payload.callType;
    this.handlers.onStateChange?.("ringing");
    this.handlers.onIncomingCall?.({ callType: payload.callType, fromUserId: payload.fromUserId });
  }

  /** Accept the most recent incoming offer. Returns the local media stream. */
  async acceptCall() {
    if (!this.pendingOffer) throw new Error("No pending call to accept.");
    const { sdp, callType, callId } = this.pendingOffer;
    await this._ensureUserId();
    this.callType = callType;
    this.callId = callId;
    this.pc = this._createPeerConnection();

    const { data: joined, error } = await this.client.rpc(WISP_RPCS.joinCall, { p_call_id: callId });
    if (error || joined !== true) throw error || new Error("The call could not be joined.");

    try {
      const stream = await this._getLocalStream(callType);
      stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this._flushPendingIce();
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this._send("answer", {
        sdp: answer,
        callId: this.callId,
        fromUserId: this.myUserId,
      });
      this.pendingOffer = null;
      this.handlers.onStateChange?.("connected");
      return stream;
    } catch (callError) {
      await this._releaseCallRecords().catch((releaseError) => {
        console.warn("Wisp could not release the failed incoming call immediately.", releaseError);
      });
      this._teardownLocal();
      throw callError;
    }
  }

  async declineCall() {
    const callId = this.pendingOffer?.callId;
    this.callId = isUuid(callId) ? callId : this.callId;
    this.pendingOffer = null;
    try {
      await this._finishCall({ notifyPeer: true });
    } finally {
      this._teardownLocal();
      this.handlers.onStateChange?.("ended");
    }
  }

  async _onAnswer(payload) {
    if (!this.pc || !validDescription(payload.sdp, "answer")) return;
    if (!isUuid(payload.fromUserId) || payload.callId !== this.callId) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    await this._flushPendingIce();
  }

  async _onRemoteIce(payload) {
    if (!validCandidate(payload.candidate) || !isUuid(payload.fromUserId)) return;
    if (payload.callId && this.callId && payload.callId !== this.callId) return;
    if (!this.pc?.remoteDescription) {
      if (this.pendingIce.length < 64) this.pendingIce.push(payload.candidate);
      return;
    }
    await this.pc.addIceCandidate(payload.candidate);
  }

  async _onRemoteEnd(payload) {
    if (payload.callId && this.callId && payload.callId !== this.callId) return;
    try {
      await this._releaseCallRecords();
    } catch (error) {
      console.warn("Wisp could not confirm the remote call ended.", error);
    } finally {
      this._teardownLocal();
      this.handlers.onStateChange?.("ended");
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

  async _releaseCallRecords({ keepalive = false } = {}) {
    const callIds = new Set(outstandingCallIds.get(this.chatId) || []);
    if (isUuid(this.callId)) callIds.add(this.callId);
    if (isUuid(this.pendingOffer?.callId)) callIds.add(this.pendingOffer.callId);
    if (!callIds.size) return true;

    const results = await Promise.allSettled(
      [...callIds].map((callId) => this._endCallRecord(callId, { keepalive })),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    return true;
  }

  async _finishCall({ notifyPeer = false, keepalive = false } = {}) {
    const callId = isUuid(this.callId) ? this.callId : this.pendingOffer?.callId;
    const signalPromise = notifyPeer && isUuid(callId)
      ? this._send("end", { callId, fromUserId: this.myUserId })
      : Promise.resolve();
    const [signalResult, releaseResult] = await Promise.allSettled([
      signalPromise,
      this._releaseCallRecords({ keepalive }),
    ]);
    if (signalResult.status === "rejected") {
      console.warn("Wisp could not deliver the call-end signal.", signalResult.reason);
    }
    if (releaseResult.status === "rejected") throw releaseResult.reason;
    return true;
  }

  _teardownLocal() {
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
    this.callId = null;
    this.callType = null;
  }

  async hangUp() {
    try {
      await this._finishCall({ notifyPeer: true });
    } finally {
      this._teardownLocal();
      this.handlers.onStateChange?.("ended");
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
    const releasePromise = this._releaseCallRecords({ keepalive });
    this.destroyed = true;
    this._teardownLocal();
    try {
      await releasePromise;
    } finally {
      this.authSubscription?.unsubscribe();
      await this.client.removeChannel(this.channel).catch(() => {});
    }
  }
}

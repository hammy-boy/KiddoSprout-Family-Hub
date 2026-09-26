(function (global) {
  "use strict";

  if (global.KiddoSproutFamilyCalls) return;

  const RING_TIMEOUT_MS = 90_000;
  const TERMINAL_PHASES = new Set(["demo", "ended", "error", "permission-required"]);
  const AUDIO_CONSTRAINTS = Object.freeze({
    audio: Object.freeze({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    }),
    video: false
  });

  function safeClone(value) {
    if (!value || typeof value !== "object") return value;
    return JSON.parse(JSON.stringify(value));
  }

  function messageFor(reason, fallback) {
    const messages = {
      demo: "Live family calls are off in the colleague preview.",
      offline: "You are offline. Reconnect or use Parent Chat.",
      "permission-required": "Press Call or Answer before microphone access can start.",
      "microphone-denied": "Microphone access was not allowed. You can still use Parent Chat.",
      timeout: "Nobody answered this time. You can try again or use Parent Chat.",
      declined: "The parent could not answer this time.",
      cancelled: "The call was cancelled.",
      ended: "The call has ended.",
      "answered-elsewhere": "This call was answered on another parent device.",
      "connection-failed": "The audio connection could not be completed. Try again or use Parent Chat."
    };
    return messages[reason] || fallback || "The family call could not continue.";
  }

  function createController(options = {}) {
    const setTimer = options.setTimeout || global.setTimeout?.bind(global);
    const clearTimer = options.clearTimeout || global.clearTimeout?.bind(global);
    const now = options.now || (() => Date.now());
    const isOnline = options.isOnline || (() => true);
    const hasUserActivation = options.hasUserActivation || (() => false);
    const mediaDevices = options.mediaDevices;
    const createPeerConnection = options.createPeerConnection;
    const signaling = options.signaling;
    const remoteAudio = options.remoteAudio || null;
    const notify = typeof options.onStateChange === "function" ? options.onStateChange : () => {};
    const publicDemoOnly = options.publicDemoOnly === true
      || global.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true;

    let state = Object.freeze({
      phase: "idle",
      role: "",
      reason: "",
      message: "Ready for an internet audio call.",
      callId: "",
      topic: "",
      expiresAt: "",
      startedAt: 0,
      muted: false
    });
    let operation = 0;
    let localStream = null;
    let peer = null;
    let pendingRemoteCandidates = [];
    let ringTimer = 0;
    let destroyed = false;
    let subscribed = false;
    let offerStarted = false;
    let callAccepted = false;

    function publish(patch) {
      state = Object.freeze({ ...state, ...patch });
      notify(safeClone(state));
      return state;
    }

    function stopTimer() {
      if (ringTimer && clearTimer) clearTimer(ringTimer);
      ringTimer = 0;
    }

    function ringTimeoutFor(expiresAt) {
      const parsedExpiry = Date.parse(String(expiresAt || ""));
      const remaining = Number.isFinite(parsedExpiry) ? parsedExpiry - now() : RING_TIMEOUT_MS;
      return Math.max(0, Math.min(RING_TIMEOUT_MS, remaining));
    }

    function stopStream(stream) {
      try {
        stream?.getTracks?.().forEach((track) => track?.stop?.());
      } catch (error) {
        // Continue closing the peer and signaling channel.
      }
    }

    async function closeTransport() {
      stopTimer();
      stopStream(localStream);
      localStream = null;
      if (remoteAudio) {
        try { remoteAudio.srcObject = null; } catch (error) {}
      }
      if (peer) {
        try { peer.close?.(); } catch (error) {}
      }
      peer = null;
      pendingRemoteCandidates = [];
      offerStarted = false;
      callAccepted = false;
      if (subscribed || signaling) {
        subscribed = false;
        try { await signaling?.close?.(); } catch (error) {}
      }
    }

    async function finish(reason, remoteAction = "") {
      if (destroyed && state.phase === "ended") return state;
      operation += 1;
      if (remoteAction && state.callId) {
        try { await signaling?.update?.(remoteAction, state.callId); } catch (error) {}
      }
      await closeTransport();
      return publish({
        phase: "ended",
        reason,
        message: messageFor(reason),
        muted: false
      });
    }

    function attachPeer(stream) {
      if (typeof createPeerConnection !== "function") {
        throw new Error("Audio calling is not supported in this browser.");
      }
      const connection = createPeerConnection();
      stream?.getAudioTracks?.().forEach((track) => connection.addTrack?.(track, stream));
      connection.addEventListener?.("icecandidate", (event) => {
        if (!event?.candidate || !subscribed) return;
        const kind = state.role === "child" ? "child-ice" : "parent-ice";
        void signaling?.send?.(kind, { candidate: event.candidate.toJSON?.() || event.candidate });
      });
      connection.addEventListener?.("track", (event) => {
        const streamFromEvent = event?.streams?.[0];
        if (!remoteAudio || !streamFromEvent) return;
        remoteAudio.srcObject = streamFromEvent;
        Promise.resolve(remoteAudio.play?.()).catch(() => {});
      });
      const publishConnectionState = () => {
        if (!peer || peer !== connection) return;
        if (connection.connectionState === "connected") {
          stopTimer();
          publish({ phase: "active", reason: "", message: "Audio call connected.", startedAt: now() });
        } else if (["failed", "closed"].includes(connection.connectionState) && !TERMINAL_PHASES.has(state.phase)) {
          void finish("connection-failed", "end");
        }
      };
      connection.addEventListener?.("connectionstatechange", publishConnectionState);
      return connection;
    }

    async function sendOffer() {
      if (!peer || state.role !== "child" || offerStarted) return;
      offerStarted = true;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await signaling.send("offer", { description: peer.localDescription || offer });
      publish({ phase: "connecting", message: "Parent answered. Connecting audio…" });
    }

    async function flushRemoteCandidates() {
      if (!peer?.remoteDescription || !pendingRemoteCandidates.length) return;
      const candidates = pendingRemoteCandidates;
      pendingRemoteCandidates = [];
      for (const candidate of candidates) {
        await peer.addIceCandidate(candidate);
      }
    }

    async function handleSignal(signal = {}) {
      if (!peer || !signal || typeof signal !== "object") return;
      const kind = String(signal.kind || signal.event || "");
      const payload = signal.payload && typeof signal.payload === "object" ? signal.payload : signal;
      try {
        if (kind === "ready" && state.role === "child") {
          await sendOffer();
        } else if (kind === "offer" && state.role === "parent" && payload.description) {
          await peer.setRemoteDescription(payload.description);
          await flushRemoteCandidates();
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await signaling.send("answer", { description: peer.localDescription || answer });
          publish({ phase: "connecting", message: "Connecting audio…" });
        } else if (kind === "answer" && state.role === "child" && payload.description) {
          await peer.setRemoteDescription(payload.description);
          await flushRemoteCandidates();
        } else if (
          ((kind === "child-ice" && state.role === "parent") || (kind === "parent-ice" && state.role === "child"))
          && payload.candidate
        ) {
          if (peer.remoteDescription) await peer.addIceCandidate(payload.candidate);
          else pendingRemoteCandidates.push(payload.candidate);
        } else if (kind === "hangup") {
          await finish("ended");
        }
      } catch (error) {
        await finish("connection-failed", "end");
      }
    }

    async function handleCallChange(change = {}) {
      if (TERMINAL_PHASES.has(state.phase)) return;
      const changedCallId = String(change.id || change.call_id || change.new?.id || change.new?.call_id || "");
      if (changedCallId && state.callId && changedCallId !== state.callId) return state;
      const status = String(change.status || change.call_status || change.new?.status || "");
      if (!status) return state;
      if (status === "active" && state.role === "child" && ["preparing", "ringing"].includes(state.phase)) {
        publish({ phase: "connecting", message: "Parent answered. Connecting audio…" });
        await sendOffer();
      } else if (status === "active" && state.role === "parent" && state.phase === "incoming") {
        await finish("answered-elsewhere");
      } else if (["declined", "cancelled", "ended", "missed"].includes(status)) {
        const reason = status === "missed" ? "timeout" : status;
        await finish(reason);
      }
      return state;
    }

    async function subscribeToCall(call, ticket) {
      const result = await signaling.subscribe({
        call,
        onSignal: handleSignal,
        onCallChange: handleCallChange
      });
      if (ticket !== operation || destroyed) {
        await signaling.close?.();
        return false;
      }
      subscribed = result?.status === "SUBSCRIBED" || result === true || Boolean(result);
      if (!subscribed) throw new Error("The private audio channel could not be opened.");
      return true;
    }

    async function acquireMicrophone(ticket) {
      if (!mediaDevices?.getUserMedia) throw new Error("This browser cannot use an audio microphone.");
      const stream = await mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      if (ticket !== operation || destroyed) {
        stopStream(stream);
        return null;
      }
      return stream;
    }

    async function startChildCall(request = {}) {
      if (publicDemoOnly) {
        return publish({ phase: "demo", role: "child", reason: "demo", message: messageFor("demo") });
      }
      if (!["idle", "ended", "error", "permission-required"].includes(state.phase)) return state;
      if (!isOnline()) {
        return publish({ phase: "error", role: "child", reason: "offline", message: messageFor("offline") });
      }
      if (!hasUserActivation()) {
        return publish({
          phase: "permission-required",
          role: "child",
          reason: "permission-required",
          message: messageFor("permission-required")
        });
      }
      const ticket = ++operation;
      publish({ phase: "preparing", role: "child", reason: "", message: "Starting microphone…", muted: false });
      try {
        const stream = await acquireMicrophone(ticket);
        if (!stream) return state;
        localStream = stream;
        peer = attachPeer(stream);
        const call = await signaling.startCall(request);
        if (ticket !== operation || destroyed) {
          try { await signaling.update?.("cancel", call?.id); } catch (error) {}
          await closeTransport();
          return state;
        }
        const callId = String(call?.id || call?.call_id || "");
        const topic = String(call?.topic || (callId ? `family-call:${callId}` : ""));
        if (!callId || !topic) throw new Error("The family call did not receive a private channel.");
        publish({
          phase: "preparing",
          callId,
          topic,
          expiresAt: String(call?.expiresAt || call?.call_expires_at || ""),
          startedAt: now(),
          message: "Opening the private family channel…"
        });
        if (!await subscribeToCall({ ...call, id: callId, topic }, ticket)) return state;
        publish({ phase: "ringing", message: "Calling parent…" });
        ringTimer = setTimer?.(() => finish("timeout", "cancel"), ringTimeoutFor(state.expiresAt)) || 0;
      } catch (error) {
        if (ticket !== operation || destroyed) return state;
        if (state.callId) {
          try { await signaling.update?.("cancel", state.callId); } catch (updateError) {}
        }
        await closeTransport();
        const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
        publish({
          phase: "error",
          role: "child",
          reason: denied ? "microphone-denied" : "connection-failed",
          message: messageFor(denied ? "microphone-denied" : "connection-failed")
        });
      }
      return state;
    }

    function receiveIncomingCall(call = {}) {
      if (publicDemoOnly || destroyed) return state;
      const callId = String(call.id || call.call_id || "");
      if (!callId || !["idle", "ended", "error"].includes(state.phase)) return state;
      const expiresAt = String(call.expiresAt || call.call_expires_at || "");
      stopTimer();
      callAccepted = false;
      const incomingState = publish({
        phase: "incoming",
        role: "parent",
        reason: "",
        message: `${String(call.childName || call.child_name || "Your child")} is calling.`,
        callId,
        topic: String(call.topic || `family-call:${callId}`),
        expiresAt,
        startedAt: now(),
        muted: false
      });
      ringTimer = setTimer?.(() => finish("timeout"), ringTimeoutFor(expiresAt)) || 0;
      return incomingState;
    }

    async function acceptIncomingCall(call = {}) {
      if (publicDemoOnly) return publish({ phase: "demo", role: "parent", reason: "demo", message: messageFor("demo") });
      if (state.phase !== "incoming") return state;
      if (!isOnline()) return finish("offline");
      if (!hasUserActivation()) {
        return publish({ phase: "permission-required", role: "parent", reason: "permission-required", message: messageFor("permission-required") });
      }
      const ticket = ++operation;
      publish({ phase: "preparing", role: "parent", message: "Starting microphone…", reason: "" });
      try {
        const stream = await acquireMicrophone(ticket);
        if (!stream) return state;
        localStream = stream;
        peer = attachPeer(stream);
        const activeCall = {
          ...call,
          id: state.callId,
          topic: state.topic
        };
        if (!await subscribeToCall(activeCall, ticket)) return state;
        await signaling.update("accept", state.callId);
        if (ticket !== operation || destroyed) return state;
        callAccepted = true;
        publish({ phase: "connecting", message: "Connecting to your child…" });
        await signaling.send("ready", { ready: true });
      } catch (error) {
        if (ticket !== operation || destroyed) return state;
        if (state.callId) {
          try { await signaling.update?.("decline", state.callId); } catch (updateError) {}
        }
        await closeTransport();
        const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
        publish({
          phase: "error",
          role: "parent",
          reason: denied ? "microphone-denied" : "connection-failed",
          message: messageFor(denied ? "microphone-denied" : "connection-failed")
        });
      }
      return state;
    }

    async function declineIncomingCall() {
      return state.phase === "incoming" ? finish("declined", "decline") : state;
    }

    function stopAction() {
      if (state.phase === "incoming") return "decline";
      if (state.role === "child" && ["preparing", "ringing"].includes(state.phase)) return "cancel";
      if (state.role === "parent" && state.phase === "preparing" && !callAccepted) return "decline";
      return "end";
    }

    function reasonForStopAction(action) {
      return action === "decline" ? "declined" : action === "cancel" ? "cancelled" : "ended";
    }

    async function cancelCall() {
      if (["idle", "ended", "demo"].includes(state.phase)) return state;
      const action = stopAction();
      return finish(reasonForStopAction(action), action);
    }

    async function endCall() {
      if (["idle", "ended", "demo"].includes(state.phase)) return state;
      const action = stopAction();
      if (action === "end") {
        try { await signaling?.send?.("hangup", { ended: true }); } catch (error) {}
      }
      return finish(reasonForStopAction(action), action);
    }

    function toggleMuted() {
      if (!localStream) return state;
      const muted = !state.muted;
      localStream.getAudioTracks?.().forEach((track) => { track.enabled = !muted; });
      return publish({ muted, message: muted ? "Microphone muted." : "Microphone on." });
    }

    function getState() {
      return safeClone(state);
    }

    async function destroy() {
      if (destroyed) return;
      destroyed = true;
      operation += 1;
      await closeTransport();
      publish({ phase: "ended", reason: "ended", message: messageFor("ended"), muted: false });
    }

    const leaveHandler = () => { void destroy(); };
    global.addEventListener?.("pagehide", leaveHandler);

    publish({});
    return Object.freeze({
      acceptIncomingCall,
      cancelCall,
      declineIncomingCall,
      destroy,
      endCall,
      getState,
      receiveIncomingCall,
      receiveCallChange: handleCallChange,
      startChildCall,
      toggleMuted
    });
  }

  global.KiddoSproutFamilyCalls = Object.freeze({
    AUDIO_CONSTRAINTS,
    constants: Object.freeze({ RING_TIMEOUT_MS }),
    createController
  });
}(window));

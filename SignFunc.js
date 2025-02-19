const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const roomCodeInput = document.getElementById('roomCode');
const joinButton = document.getElementById('joinButton');
const createButton = document.getElementById('createButton');
const videoContainer = document.getElementById('videoContainer');
const joinForm = document.getElementById('joinForm');
const chatContainer = document.getElementById('chatContainer');
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const toggleVideoButton = document.getElementById('toggleVideo');
const toggleAudioButton = document.getElementById('toggleAudio');
const leaveRoomButton = document.getElementById('leaveRoom');
const gestureRecognitionButton = document.getElementById('gestureRecognition');

let localStream;
let peerConnection;
let roomCode;
let dataChannel;
let ws;

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

function connectToSignalingServer() {
    ws = new WebSocket('wss://your-signaling-server.com'); // Replace with actual server URL
    
    ws.onopen = () => {
        console.log('Connected to signaling server');
    };

    ws.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case 'offer':
                await handleOffer(data.offer);
                break;
            case 'answer':
                await handleAnswer(data.answer);
                break;
            case 'candidate':
                await handleCandidate(data.candidate);
                break;
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

createButton.addEventListener('click', () => {
    roomCode = generateRoomCode();
    roomCodeInput.value = roomCode;
    connectToSignalingServer();
    joinRoom(roomCode);
});

joinButton.addEventListener('click', () => {
    roomCode = roomCodeInput.value;
    if (roomCode) {
        connectToSignalingServer();
        joinRoom(roomCode);
    }
});

function joinRoom(code) {
    joinForm.style.display = 'none';
    videoContainer.style.display = 'flex';
    chatContainer.style.display = 'block';
    startLocalStream().then(() => {
        initializePeerConnection();
        ws.send(JSON.stringify({ type: 'join', room: code }));
    });
}

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, room: roomCode }));
        }
    };

    dataChannel = peerConnection.createDataChannel('chat');
    dataChannel.onmessage = event => appendMessage(event.data, 'remote');
}

async function handleOffer(offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', answer, room: roomCode }));
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

sendButton.addEventListener('click', () => {
    const message = chatInput.value;
    if (message && dataChannel.readyState === 'open') {
        dataChannel.send(message);
        appendMessage(message, 'local');
        chatInput.value = '';
    }
});

function appendMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add(sender === 'local' ? 'local-message' : 'remote-message');
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

toggleVideoButton.addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
});

toggleAudioButton.addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
});

leaveRoomButton.addEventListener('click', () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (peerConnection) peerConnection.close();
    videoContainer.style.display = 'none';
    joinForm.style.display = 'block';
    chatContainer.style.display = 'none';
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    chatBox.innerHTML = '';
    chatInput.value = '';
});

gestureRecognitionButton.addEventListener('click', () => {
    alert('Gesture Recognition is not implemented yet.');
});

startLocalStream();

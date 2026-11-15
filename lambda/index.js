'use strict';

// Paste a permanent, direct HTTPS link to your athan MP3 here.
// Leave the recording at its full length: 5 min 30 sec or longer is supported.
const AUDIO_URL = '';
const TRACK_TOKEN = 'my-athan-v1';

function reply(response = {}) {
    return { version: '1.0', response };
}

function say(text) {
    return reply({
        outputSpeech: { type: 'PlainText', text },
        shouldEndSession: true
    });
}

function audioReply(event, directives) {
    const response = { directives };
    if (['LaunchRequest', 'IntentRequest'].includes(event.request?.type)) {
        response.shouldEndSession = true;
    }
    return reply(response);
}

function stop(event) {
    return audioReply(event, [{ type: 'AudioPlayer.Stop' }]);
}

function hasAudioPlayer(event) {
    return Boolean(event.context?.System?.device?.supportedInterfaces?.AudioPlayer);
}

function getAudioUrl() {
    const value = process.env.ATHAN_AUDIO_URL || AUDIO_URL;
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') ||
        url.username || url.password || url.hostname === 'example.com' ||
        url.hostname.endsWith('.example.com')) {
        return null;
    }
    return url.href;
}

function play(event, resume = false) {
    const isController = event.request?.type?.startsWith('PlaybackController.');
    if (!hasAudioPlayer(event)) {
        if (isController) return reply();
        return say('Please open My Athan on an Echo device that supports audio playback.');
    }
    const url = getAudioUrl();
    if (!url) {
        if (isController) return reply();
        return say('My Athan needs its audio link configured in the skill code.');
    }
    const player = event.context?.AudioPlayer;
    const canResume = resume && player?.token === TRACK_TOKEN &&
        !['FINISHED', 'IDLE'].includes(player.playerActivity) &&
        Number.isSafeInteger(player.offsetInMilliseconds) &&
        player.offsetInMilliseconds >= 0;

    return audioReply(event, [{
            type: 'AudioPlayer.Play',
            playBehavior: 'REPLACE_ALL',
            audioItem: {
                stream: {
                    token: TRACK_TOKEN,
                    url,
                    offsetInMilliseconds: canResume ? player.offsetInMilliseconds : 0
                }
            }
        }]);
}

// Alexa-hosted Node.js Lambda entry point: index.handler.
exports.handler = async function handler(event) {
    const request = event?.request || {};
    const type = request.type || '';

    // Playback notifications have no active skill session. They must not
    // trigger speech or restart the athan. No next item is queued.
    if (type.startsWith('AudioPlayer.') || type === 'System.ExceptionEncountered' ||
        type === 'SessionEndedRequest') {
        if (type === 'AudioPlayer.PlaybackFailed') {
            // Avoid logging the whole request or a signed media URL.
            console.error('Athan playback failed:', request.error?.type || 'UNKNOWN');
        }
        return reply();
    }

    if (type === 'LaunchRequest') return play(event);
    if (type === 'PlaybackController.PlayCommandIssued') return play(event, true);
    if (type === 'PlaybackController.PauseCommandIssued') return stop(event);
    if (type === 'PlaybackController.PreviousCommandIssued') return play(event);
    if (type === 'PlaybackController.NextCommandIssued') return stop(event);

    if (type === 'IntentRequest') {
        switch (request.intent?.name) {
            case 'PlayAthanIntent':
            case 'AMAZON.StartOverIntent':
            case 'AMAZON.RepeatIntent':
            case 'AMAZON.PreviousIntent':
                return play(event);
            case 'AMAZON.ResumeIntent':
                return play(event, true);
            case 'AMAZON.PauseIntent':
            case 'AMAZON.StopIntent':
            case 'AMAZON.CancelIntent':
            case 'AMAZON.NextIntent':
                return stop(event);
            case 'AMAZON.HelpIntent':
                return say('Say Alexa, open My Athan, to play the full recording. Say Alexa, stop, to stop playback.');
            case 'AMAZON.LoopOnIntent':
            case 'AMAZON.LoopOffIntent':
            case 'AMAZON.ShuffleOnIntent':
            case 'AMAZON.ShuffleOffIntent':
                return say('My Athan plays one recording once. Say Alexa, open My Athan, to start it again.');
            default:
                return say('Say Alexa, open My Athan, to play the recording.');
        }
    }

    return reply();
};

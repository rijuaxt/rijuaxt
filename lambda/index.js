'use strict';

// Paste a permanent, direct HTTPS link to your athan MP3 here.
// Leave the recording at its full length: 5 min 30 sec or longer is supported.
const AUDIO_URL = '';
const TRACK_TOKEN = 'my-athan-v1';
const PRAYERS = [
    { id: 'FAJR', name: 'Fajr', aliases: ['fajar', 'fajir'] },
    { id: 'ZUHR', name: 'Zuhr', aliases: ['dhuhr', 'zuhur', 'zohor', 'zuhoor', 'zuhuor'] },
    { id: 'ASR', name: 'Asr', aliases: ['asar', 'asor'] },
    { id: 'MAGHRIB', name: 'Maghrib', aliases: ['magrib', 'maghrib prayer'] },
    { id: 'ISHA', name: 'Isha', aliases: ['esha', 'ishaa'] }
];

function findPrayer(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return PRAYERS.find(prayer => [prayer.id, prayer.name, ...prayer.aliases]
        .some(alias => alias.toLowerCase() === normalized)) || null;
}

function resolvePrayer(slot) {
    const candidates = [];
    for (const authority of slot?.resolutions?.resolutionsPerAuthority || []) {
        if (authority.status?.code !== 'ER_SUCCESS_MATCH') continue;
        for (const entry of authority.values || []) {
            const prayer = findPrayer(entry.value?.id) || findPrayer(entry.value?.name);
            if (prayer && !candidates.includes(prayer)) candidates.push(prayer);
        }
    }
    // Do not choose a prayer when entity resolution is ambiguous.
    if (candidates.length > 1) return null;
    return candidates[0] || findPrayer(slot?.value);
}

function prayerSettings() {
    const response = say('Create one routine for each prayer in the Alexa app. ' +
        'Open More, then Routines, and select the prayer. ' +
        'Edit its name to rename it, or edit its Schedule event to change the time, then save. ' +
        'My Athan does not change routine times by voice or update them automatically.');
    response.response.card = {
        type: 'Simple',
        title: 'Prayer names and times',
        content: 'Create five routines: Fajar, Zuhur, Asar, Magrib, and Isha.\n' +
            'Alexa app > More > Routines > select a prayer.\n' +
            'Rename: edit the routine name and save.\n' +
            'Time: edit the Schedule event, choose the new time and repeat days, and save.\n' +
            'Use a Custom action such as: ask my athan to play fajr.\n' +
            'Renaming a routine does not change its Custom action.\n' +
            'Times stay fixed until you edit them; daily prayer times are not calculated.'
    };
    return response;
}

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
            case 'PlayAthanIntent': {
                const slot = request.intent.slots?.prayer;
                const prayer = resolvePrayer(slot);
                if ((slot?.value || slot?.resolutions) && !prayer) {
                    return say('Please choose Fajr, Zuhr, Asr, Maghrib, or Isha.');
                }
                const response = play(event);
                // Keep the full recording and silent start for every prayer.
                // A card identifies the prayer without speaking over the audio.
                if (prayer && response.response.directives?.some(
                    directive => directive.type === 'AudioPlayer.Play')) {
                    response.response.card = {
                        type: 'Simple',
                        title: `${prayer.name} Athan`,
                        content: 'Playing your complete Athan recording. ' +
                            'Edit the name and time of this prayer in Alexa app > More > Routines.'
                    };
                }
                return response;
            }
            case 'PrayerSettingsIntent':
                return prayerSettings();
            case 'ListPrayersIntent':
                return say('You can play Fajr, Zuhr, Asr, Maghrib, and Isha. ' +
                    'For example, say Alexa, ask My Athan to play Fajr. ' +
                    'Give each prayer its own routine in the Alexa app to choose its name and time.');
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
                return say('Say Alexa, open My Athan, to play the full recording, ' +
                    'or say Alexa, ask My Athan to play Fajr, Zuhr, Asr, Maghrib, or Isha. ' +
                    'Edit each prayer routine name and scheduled time in the Alexa app under More, Routines. ' +
                    'Say Alexa, stop, to stop playback.');
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

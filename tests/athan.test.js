'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../lambda/index.js');
const { interactionModel } = require('../skill-package/interactionModels/custom/en-US.json');

const originalUrl = process.env.ATHAN_AUDIO_URL;
const audioUrl = 'https://media.test/athan.mp3';
process.env.ATHAN_AUDIO_URL = audioUrl;
after(() => {
    if (originalUrl === undefined) delete process.env.ATHAN_AUDIO_URL;
    else process.env.ATHAN_AUDIO_URL = originalUrl;
});

function event(type, intent) {
    return {
        request: { type, ...(intent && { intent }) },
        context: {
            System: { device: { supportedInterfaces: { AudioPlayer: {} } } }
        }
    };
}

function playRequest(prayer) {
    return event('IntentRequest', {
        name: 'PlayAthanIntent', slots: { prayer }
    });
}

function assertFullRecording(result) {
    assert.equal(result.version, '1.0');
    assert.equal(result.response.shouldEndSession, true);
    assert.equal(result.response.outputSpeech, undefined);
    assert.deepEqual(result.response.directives, [{
        type: 'AudioPlayer.Play',
        playBehavior: 'REPLACE_ALL',
        audioItem: { stream: {
            token: 'my-athan-v1', url: audioUrl, offsetInMilliseconds: 0
        } }
    }]);
}

test('all five prayers and model aliases start the same full recording silently', async () => {
    const prayers = interactionModel.languageModel.types.find(type => type.name === 'PRAYER_NAME');
    assert.equal(prayers.values.length, 5);
    for (const prayer of prayers.values) {
        const expectedTitle = `${prayer.name.value[0].toUpperCase()}${prayer.name.value.slice(1)} Athan`;
        for (const value of [prayer.name.value, ...prayer.name.synonyms]) {
            const result = await handler(playRequest({ value }));
            assertFullRecording(result);
            assert.equal(result.response.card.title, expectedTitle);
        }
    }
});

test('Alexa entity resolution maps a recognized spoken variant to its prayer ID', async () => {
    const result = await handler(playRequest({
        value: 'a recognized pronunciation',
        resolutions: { resolutionsPerAuthority: [{
            status: { code: 'ER_SUCCESS_MATCH' },
            values: [{ value: { id: 'FAJR', name: 'fajr' } }]
        }] }
    }));
    assertFullRecording(result);
    assert.equal(result.response.card.title, 'Fajr Athan');
});

test('unknown and ambiguous prayer names do not start playback', async () => {
    const slots = [
        { value: 'unknown prayer' },
        { value: 'unclear', resolutions: { resolutionsPerAuthority: [{
            status: { code: 'ER_SUCCESS_MATCH' },
            values: ['FAJR', 'ISHA'].map(id => ({ value: { id } }))
        }] } }
    ];
    for (const slot of slots) {
        const result = await handler(playRequest(slot));
        assert.equal(result.response.directives, undefined);
        assert.match(result.response.outputSpeech.text, /choose Fajr, Zuhr, Asr, Maghrib, or Isha/);
    }
});

test('launch and existing generic play commands still play once from the start', async () => {
    assertFullRecording(await handler(event('LaunchRequest')));
    assertFullRecording(await handler(event('IntentRequest', { name: 'PlayAthanIntent' })));
    assertFullRecording(await handler(playRequest({ name: 'prayer' })));
});

test('prayer settings explain editable app controls without claiming to change a schedule', async () => {
    const result = await handler(event('IntentRequest', { name: 'PrayerSettingsIntent' }));
    assert.equal(result.response.directives, undefined);
    assert.match(result.response.outputSpeech.text, /does not change routine times by voice/);
    assert.match(result.response.card.content, /Rename:.*routine name/);
    assert.match(result.response.card.content, /Time:.*Schedule event/);
    for (const label of ['Fajar', 'Zuhur', 'Asar', 'Magrib', 'Isha']) {
        assert.ok(result.response.card.content.includes(label));
    }
});

test('listing prayers and help offer the five prayers and routine controls', async () => {
    for (const name of ['ListPrayersIntent', 'AMAZON.HelpIntent']) {
        const result = await handler(event('IntentRequest', { name }));
        for (const prayer of ['Fajr', 'Zuhr', 'Asr', 'Maghrib', 'Isha']) {
            assert.ok(result.response.outputSpeech.text.includes(prayer));
        }
        assert.match(result.response.outputSpeech.text, /routine/i);
        assert.equal(result.response.directives, undefined);
    }
});

test('missing audio configuration still reports setup rather than pretending to play', async () => {
    delete process.env.ATHAN_AUDIO_URL;
    try {
        const result = await handler(playRequest({ value: 'fajar' }));
        assert.match(result.response.outputSpeech.text, /audio link configured/);
        assert.equal(result.response.card, undefined);
        assert.equal(result.response.directives, undefined);
    } finally {
        process.env.ATHAN_AUDIO_URL = audioUrl;
    }
});

test('a named prayer on a device without AudioPlayer still reports the device requirement', async () => {
    const request = playRequest({ value: 'isha' });
    request.context.System.device.supportedInterfaces = {};
    const result = await handler(request);
    assert.match(result.response.outputSpeech.text, /Echo device/);
    assert.equal(result.response.card, undefined);
    assert.equal(result.response.directives, undefined);
});

test('pause and resume retain the current playback position', async () => {
    const paused = await handler(event('IntentRequest', { name: 'AMAZON.PauseIntent' }));
    assert.deepEqual(paused.response.directives, [{ type: 'AudioPlayer.Stop' }]);
    const request = event('IntentRequest', { name: 'AMAZON.ResumeIntent' });
    request.context.AudioPlayer = {
        token: 'my-athan-v1', playerActivity: 'STOPPED', offsetInMilliseconds: 123456
    };
    const resumed = await handler(request);
    assert.equal(resumed.response.directives[0].audioItem.stream.offsetInMilliseconds, 123456);
    request.context.AudioPlayer.token = 'another-skill-track';
    assertFullRecording(await handler(request));
});

test('playback notifications never speak, restart or loop the recording', async () => {
    for (const type of ['PlaybackStarted', 'PlaybackStopped', 'PlaybackFinished', 'PlaybackNearlyFinished']) {
        assert.deepEqual(await handler(event(`AudioPlayer.${type}`)), { version: '1.0', response: {} });
    }
});

test('playback failure and exception callbacks never restart or speak', async () => {
    for (const type of ['AudioPlayer.PlaybackFailed', 'System.ExceptionEncountered', 'SessionEndedRequest']) {
        const result = await handler(event(type));
        assert.deepEqual(result, { version: '1.0', response: {} });
    }
});

test('Echo playback controller buttons play, restart, pause and stop correctly', async () => {
    assertFullRecording(await handler(event('PlaybackController.PlayCommandIssued')));
    assertFullRecording(await handler(event('PlaybackController.PreviousCommandIssued')));
    for (const type of ['PlaybackController.PauseCommandIssued', 'PlaybackController.NextCommandIssued']) {
        const result = await handler(event(type));
        assert.deepEqual(result.response.directives, [{ type: 'AudioPlayer.Stop' }]);
    }
});

test('unusable and insecure streaming URLs are rejected', async () => {
    for (const url of [
        'http://media.test/athan.mp3',
        'https://example.com/athan.mp3',
        'https://name:password@media.test/athan.mp3',
        'https://media.test:8443/athan.mp3',
        'not an audio URL'
    ]) {
        process.env.ATHAN_AUDIO_URL = url;
        const result = await handler(event('LaunchRequest'));
        assert.equal(result.response.directives, undefined);
        assert.match(result.response.outputSpeech.text, /audio link configured/);
    }
    process.env.ATHAN_AUDIO_URL = '  ' + audioUrl + '  ';
    assertFullRecording(await handler(event('LaunchRequest')));
    process.env.ATHAN_AUDIO_URL = audioUrl;
});

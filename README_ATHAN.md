# My Athan — GitHub import package

Play the full Athan recording for **Fajr, Zuhr, Asr, Maghrib, or Isha**. Give each prayer its own Alexa Routine so you can rename it and edit its time whenever prayer times change. The skill accepts spellings including **Fajar, Zuhur, Asar, and Magrib**.

Paste this complete repository link into Alexa's **Import skill** dialog:

https://github.com/rijuaxt/rijuaxt.git

Choose **English (US)** and **Alexa-hosted (Node.js)** for the skill. This repository uses Amazon's supported skill-package layout: `lambda/index.js`, `lambda/package.json`, `skill-package/skill.json`, and `skill-package/interactionModels/custom/en-US.json`.

## Finish setup after import

1. In the Alexa developer console's **Code** tab, open `lambda/index.js` (the editor may display it as `index.js`). Set `AUDIO_URL` near the top to a permanent, direct HTTPS MP3 URL for your chosen Athan. The recording must be accessible without signing in. No recording is included in this package.
2. Save and deploy the code. Under **Build → Interfaces**, check that **Audio Player** is enabled. Save and build the interaction model.
3. Enable **Development** testing in the **Test** tab. Use an Echo signed in to the same Amazon account and say **Alexa, open My Athan**.
4. Let the recording finish, then test pause, resume, and stop on your Echo. The browser simulator can show an AudioPlayer directive but does not verify actual long audio playback.

The complete recording plays once, with no spoken introduction. A recording of about 5 minutes 30 seconds is supported; its length is determined by the MP3. Playback is not trimmed or repeated. Pause/resume uses the Echo's current playback context and does not keep a bookmark after another audio skill takes over.

## Five prayers, each with an editable name and time

Create these five separate routines in the Alexa mobile app. These are setup instructions; importing this repository does not create the routines.

| Routine name (you can rename it) | Custom action | Schedule |
| --- | --- | --- |
| Fajar Athan | `ask my athan to play fajr` | Your Fajr time |
| Zuhur Athan | `ask my athan to play zuhr` | Your Zuhr time |
| Asar Athan | `ask my athan to play asr` | Your Asr time |
| Magrib Athan | `ask my athan to play maghrib` | Your Maghrib time |
| Isha Athan | `ask my athan to play isha` | Your Isha time |

For each prayer:

1. Open **More → Routines → +** in the Alexa app.
2. Give the routine its prayer name, for example **Fajar Athan**.
3. Under **Add an event** (called **When** in some app versions), choose **Schedule**, enter your local prayer time, and choose the repeat days. Check AM/PM and the Echo's local time zone.
4. Under **Add an action**, choose **Custom** and enter the command from the table without the word “Alexa.” Put the Custom action last.
5. Choose the Echo that should play the Athan and save. Use the routine's play button to test it, then test a scheduled run before relying on it.

**Rename a prayer:** Open **More → Routines**, select the prayer, edit its routine name, and save. For example, rename **Fajar Athan** to **Fajr**. This label can be anything you prefer. Keep the Custom action unchanged: a routine's display name and the command it runs are separate settings.

**Change a prayer time:** Open that same routine, edit its **Schedule** event, choose the new time and repeat days, and save. Each prayer has its own schedule, so updating Fajr leaves the other four schedules unchanged. You can also turn each routine on or off separately.

All five prayers use the same complete recording, with no spoken introduction, trimming, or repeat. Development-skill launch from routines can vary by account/app; this package does not implement Amazon Custom Tasks. If a prayer-specific Custom action does not launch on your account, first check the direct voice command on the Echo and try `open my athan` as the routine action.

These are manually entered fixed times. The skill does not calculate daily prayer times, update schedules automatically, or change Alexa Routine names or times by voice. Its settings command explains where to make those edits in the Alexa app.

## Voice commands

- **Alexa, open My Athan.** Play the full recording now.
- **Alexa, ask My Athan to play Fajar.** Play the recording for Fajr. The same pattern works for Zuhur, Asar, Magrib, and Isha.
- **Alexa, ask My Athan to list prayers.** Hear the five available prayers.
- **Alexa, ask My Athan how do I change prayer times.** Hear instructions and receive an Alexa app card explaining the name and time controls.
- **Alexa, pause / resume / stop.** Control the current recording.

## Updating a skill you already imported

GitHub changes do not automatically update an existing Alexa-hosted skill. Copy the updated `lambda/index.js` into your skill's **Code** editor and deploy. In **Build → JSON Editor**, replace the interaction model with `skill-package/interactionModels/custom/en-US.json`, save, and build the model. Keep your configured audio URL when updating the code. Then test on the Echo before adding or editing the five routines.

For a fresh import, use the same GitHub link above and complete the audio and deployment steps.

## Local checks

Run `npm test --prefix lambda` with Node.js 18 or later. The checks cover prayer names and aliases, invalid names, settings guidance, and full-recording playback controls. Actual speech recognition, audio delivery, and routine scheduling still need testing on an Echo.

## Status

The repository is a source package for import. Audio configuration, Amazon import/deployment, Echo playback, and the five routine schedules require setup and verification in your Amazon account. If the recording URL is missing, the skill explains that its audio link needs to be configured.

## Amazon references

- [Import an Alexa-hosted skill from Git](https://developer.amazon.com/en-US/docs/alexa/hosted-skills/alexa-hosted-skills-git-import.html)
- [Stream long-form audio with AudioPlayer](https://developer.amazon.com/en-US/docs/alexa/custom-skills/use-long-form-audio.html)
- [AudioPlayer interface reference](https://developer.amazon.com/en-US/docs/alexa/custom-skills/audioplayer-interface-reference.html)
- [Create a routine in the Alexa app](https://www.amazon.com/gp/help/customer/display.html?nodeId=G2PYLKJN3XVZ55EQ)
- [Custom slot types and synonyms](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-and-edit-custom-slot-types.html)

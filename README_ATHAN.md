# My Athan — GitHub import package

Paste this complete repository link into Alexa's **Import skill** dialog:

https://github.com/rijuaxt/rijuaxt.git

Choose **English (US)** and **Alexa-hosted (Node.js)** for the skill. This repository uses Amazon's supported skill-package layout: `lambda/index.js`, `lambda/package.json`, `skill-package/skill.json`, and `skill-package/interactionModels/custom/en-US.json`.

## Finish setup after import

1. In the Alexa developer console's **Code** tab, open `lambda/index.js` (the editor may display it as `index.js`). Set `AUDIO_URL` near the top to a permanent, direct HTTPS MP3 URL for your chosen Athan. The recording must be accessible without signing in. No recording is included in this package.
2. Save and deploy the code. Under **Build → Interfaces**, check that **Audio Player** is enabled. Save and build the interaction model.
3. Enable **Development** testing in the **Test** tab. Use an Echo signed in to the same Amazon account and say **Alexa, open My Athan**.
4. Let the recording finish, then test pause, resume, and stop on your Echo. The browser simulator can show an AudioPlayer directive but does not verify actual long audio playback.

The complete recording plays once, with no spoken introduction. A recording of about 5 minutes 30 seconds is supported; its length is determined by the MP3. Playback is not trimmed or repeated. Pause/resume uses the Echo's current playback context and does not keep a bookmark after another audio skill takes over.

## Set or change playback times

In the Alexa mobile app, create one routine for each prayer time: **More → Routines → + → Schedule**, choose the time and repeat days, and add a **Custom** action containing **open my athan**. Choose the Echo and save. Put this custom action last and use the routine's play button to check it on your account before relying on the schedule. Development-skill launch from routines can vary by account/app; this package does not implement Amazon Custom Tasks.

To change the time later, edit that routine's schedule. These are manually entered fixed times; this skill does not calculate daily prayer times or update them automatically.

## Status

The repository is a source package for import. Audio configuration, Amazon import/deployment, Echo playback, and routine scheduling require setup and verification in your Amazon account. If the recording URL is missing, the skill explains that its audio link needs to be configured.

## Amazon references

- [Import an Alexa-hosted skill from Git](https://developer.amazon.com/en-US/docs/alexa/hosted-skills/alexa-hosted-skills-git-import.html)
- [Stream long-form audio with AudioPlayer](https://developer.amazon.com/en-US/docs/alexa/custom-skills/use-long-form-audio.html)
- [AudioPlayer interface reference](https://developer.amazon.com/en-US/docs/alexa/custom-skills/audioplayer-interface-reference.html)

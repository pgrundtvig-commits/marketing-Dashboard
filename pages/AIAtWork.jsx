import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const SPEAKER_NOTES = [
  "Good morning everyone. The title is doing a lot of work here. The word 'actually' matters. I'm not going to tell you what AI can do in theory. I'm going to tell you what I do with it, on real Palsgaard work, this month. Some of that will be useful. Some of it I'll tell you I don't trust. By the way, this deck was built with AI. I'll show you how at the end. That's part of the story.",
  "Two things before we start. Left side. This is not me selling you AI. I don't care if you use it or not. What I care about is whether your work gets easier. Right side. This is the only thing I want you to leave with. One task you go back to your desk and try this on. That's it. If you leave with two, you've over-achieved.",
  "Here is the thing that actually changed for me. I used to stare at a blank page. I'd sit there, knowing roughly what I wanted to say, and the cursor would blink at me. Now I never start from a blank page. I start from a draft I can react to. And that flips everything. Because it turns out I am much better at saying 'no, that's wrong, do it like this' than I am at producing the thing from scratch. Editing is faster than creating. That is the whole shift.",
  "Four real things I use it for. Top left, campaign messaging. Instead of two days of internal alignment on four angles, I get the four angles in ten minutes. Then we argue about which one is right. Top right, trade show follow-up. I paste in my notes from a booth and get a structured summary per lead. Sales gets it the same day instead of next week. Bottom left, PR. It gives me three angles I wouldn't have thought of. Bottom right, internal comms. Translating technical language into something a commercial team can use. The 'watch out' column matters more than the use case. Read those. Every one of these tools will lie to you confidently. Your job hasn't gone away. It's just moved.",
  "If you take one thing about how to use these tools, take this. The quality of the answer depends entirely on the quality of the question. Left side, vague. 'Build an app for leads.' You get a generic contact form. Useless. Right side, the same task, specific. Two minutes at a booth, photo of a business card, voice note, A B or C grading, owner assignment, CRM sync, GDPR consent. We actually built that. We used it at a live trade show. The model didn't get better in between. The brief did.",
  "And it's never one prompt. It's a conversation. Here's a real one — a LinkedIn post about bakery reformulation. Round one, too broad. Sounds like anyone could have written it. Round two, narrower audience and a sharper register. Better, but too long. Round three, shorten and strip the em dashes. Round four, end on a link, not a question. Done. The model didn't get smarter between round one and round four. The question got smarter.",
  "Right — I'm going to stop talking and actually show you. I'm going to take a real piece of work, in front of you, and we'll prompt our way through it together. Throw me a topic. Something we're working on now.",
  "OK, one use case I didn't expect. I use it to stress-test a value proposition before it gets near a customer. I paste in our positioning and I ask it to react as if it were procurement. Then R and D. Then the commercial buyer. It finds the weak spots faster than I do sitting alone in a room. One time it told me we were leading with sustainability when the real buying driver, for that customer, was cost and supply security. So we changed the story. Now — it cannot tell you what actually drives the decision. That part is still yours. But it can rehearse the objections.",
  "Three projects on my desk right now. Different problems, same shift — from my personal sandbox to something the team can use. First, the AI Skill Library. Thirteen specialised Claude skills I built for our marketing work. Tone of voice. Campaign development. KPI reports. Slide generation. They work. The problem is, they only work for me, in my Claude account. The next move is getting them into our Microsoft 365 Copilot setup, where you already work. Second, Campaign OS. A workspace I'm building in Base44, with Claude as the engine. It's not a chatbot. It's a place the campaign actually lives — with validator agents that review tone, brand fit, KPI logic, before anything reaches a customer. Third, the NPD workflow. Today, when we launch a new ingredient, we write the business case from scratch and then build the internal launch deck separately. Same data, twice the work. The workflow produces both from one structured brief. I'm not showing you this so you build the same thing. I'm showing you to make one point: this isn't theoretical anymore.",
  "So you don't leave with nothing. One starting prompt for each of you, by area. Copy these. Fill in the brackets. Iterate twice. Don't expect the first answer to be the right one. The first answer is just something to react to.",
  "OK. One more thing. This deck — this exact deck you've been looking at — was built with AI. Let me show you how, because I think the how is more interesting than the slides.",
  "Four tools, one brief, thirteen rounds. Left side, what each tool actually did. Claude built the structure and most of the slides. GPT pushed back on my framing — at one point it told me the deck would still be polished fluff unless I forced a real before-and-after. That note made the deck better. CoPilot helped with the role-specific prompts on slide nine. Base44 — the trade show app and the trend analysis — those weren't hypotheticals. Those were real builds. Right side, the brief and the method. Same brief to four tools. Took the best from each. Merged it. Iterated. I made the decisions. AI did the drafting. The order matters.",
  "How to start, without overthinking it. This week — take something you already wrote. A line, an email, a paragraph from a deck. Ask AI to make it shorter and clearer. See what it gives you. That's it. Next week — pick one recurring task. Write it as a proper brief. Audience, objective, format, constraints. Iterate twice. After that — if a prompt works, save it. Share it. One good prompt used by ten people in this team beats ten experiments that no one else ever sees.",
  "I'll end with this. The point isn't that AI is smart. It isn't, really. The point is what it makes visible. When you give it a vague brief, you see your own vague thinking, written out, in front of you. That's uncomfortable, and it's the whole value. So — what's the task you keep putting off? Start there.",
];

const DECK_CSS = `
.aiwork-root {
  --ink: #1D2B47;
  --ink-2: #1D428A;
  --ink-soft: #4A5972;
  --cream: #F7F4EE;
  --cream-2: #EFE9DC;
  --paper: #FFFFFF;
  --rust: #C15338;
  --sage: #62837F;
  --olive: #6F8263;
  --gold: #F2C75C;
  --beige: #AB9D80;
  --rule: rgba(29, 43, 71, 0.14);

  --type-display: 132px;
  --type-title: 76px;
  --type-subtitle: 48px;
  --type-lead: 38px;
  --type-body: 30px;
  --type-small: 24px;
  --type-mono: 26px;

  --pad-top: 96px;
  --pad-bottom: 96px;
  --pad-x: 120px;
  --gap-title: 56px;
  --gap-item: 28px;

  --font-sans: "Public Sans", "Helvetica Neue", Arial, sans-serif;
  --font-serif: "Source Serif 4", Georgia, serif;
  --font-script: "Caveat", "Source Serif 4", cursive;
  --font-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;

  position: absolute;
  inset: 0;
  background: #0b0f1a;
  overflow: hidden;
}

.aiwork-root * { box-sizing: border-box; }

.aiwork-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aiwork-canvas {
  position: relative;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
  background: var(--cream);
  flex-shrink: 0;
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
}

.aiwork-canvas section {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: var(--pad-top) var(--pad-x) var(--pad-bottom);
  font-family: var(--font-sans);
  color: var(--ink);
  background: var(--cream);
  overflow: hidden;
}
.aiwork-canvas > [data-hidden="true"] { visibility: hidden; opacity: 0; pointer-events: none; }

.aiwork-overlay {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 18px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border-radius: 999px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.06em;
  z-index: 5;
  pointer-events: auto;
}
.aiwork-overlay button {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.4);
  color: #fff;
  width: 28px; height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
}
.aiwork-overlay button:hover { background: rgba(255,255,255,0.12); }
.aiwork-overlay .hint { opacity: 0.7; }

.aiwork-notes {
  position: absolute;
  right: 24px;
  bottom: 24px;
  max-width: 420px;
  max-height: 45vh;
  overflow: auto;
  padding: 18px 22px;
  background: rgba(0,0,0,0.68);
  color: rgba(255,255,255,0.92);
  border-radius: 12px;
  font-family: var(--font-serif), Georgia, serif;
  font-size: 14px;
  line-height: 1.45;
  z-index: 5;
}
.aiwork-notes .lbl {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-bottom: 8px;
}

.aiwork-canvas .eyebrow {
  font-family: var(--font-mono);
  font-size: var(--type-small);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 500;
}
.aiwork-canvas .eyebrow .dot {
  display: inline-block;
  width: 10px; height: 10px;
  background: var(--rust);
  border-radius: 50%;
  margin-right: 18px;
  vertical-align: 2px;
}
.aiwork-canvas .kicker {
  font-family: var(--font-mono);
  font-size: 24px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.aiwork-canvas h1.title {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: var(--type-title);
  line-height: 1.04;
  letter-spacing: -0.025em;
  margin: 0;
  text-wrap: balance;
  max-width: 1500px;
}
.aiwork-canvas h2.subtitle {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: var(--type-subtitle);
  line-height: 1.12;
  letter-spacing: -0.018em;
  margin: 0;
  text-wrap: balance;
}
.aiwork-canvas p.lead {
  font-family: var(--font-serif);
  font-size: var(--type-lead);
  line-height: 1.32;
  letter-spacing: -0.005em;
  margin: 0;
  max-width: 1400px;
}
.aiwork-canvas p.body {
  font-size: var(--type-body);
  line-height: 1.42;
  margin: 0;
  max-width: 1400px;
}
.aiwork-canvas .serif { font-family: var(--font-serif); }
.aiwork-canvas .mono { font-family: var(--font-mono); }
.aiwork-canvas .rust { color: var(--rust); }
.aiwork-canvas .muted { color: var(--ink-soft); }
.aiwork-canvas .rule { height: 1px; background: var(--rule); width: 100%; }

.aiwork-canvas .dark { background: var(--ink); color: var(--cream); }
.aiwork-canvas .dark .eyebrow, .aiwork-canvas .dark .kicker, .aiwork-canvas .dark .muted { color: rgba(247,244,238,0.65); }
.aiwork-canvas .dark .rule { background: rgba(247,244,238,0.18); }

/* 01 — Title */
.aiwork-canvas .slide-title { background: var(--ink); color: var(--cream); justify-content: space-between; padding-top: 80px; }
.aiwork-canvas .slide-title .top-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em;
  text-transform: uppercase; color: rgba(247,244,238,0.7);
}
.aiwork-canvas .slide-title .top-row .brand { display: flex; align-items: center; gap: 18px; color: var(--cream); }
.aiwork-canvas .slide-title .top-row .brand .mark { width: 28px; height: 28px; border-radius: 50%; background: var(--rust); }
.aiwork-canvas .slide-title h1 {
  font-family: var(--font-sans); font-weight: 600; font-size: 184px;
  line-height: 0.94; letter-spacing: -0.035em; margin: 0; color: var(--cream);
}
.aiwork-canvas .slide-title h1 em { font-style: italic; font-family: var(--font-serif); font-weight: 400; color: var(--gold); }
.aiwork-canvas .slide-title .footnote {
  display: grid; grid-template-columns: 1fr auto; gap: 80px; align-items: end;
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.04em;
  color: rgba(247,244,238,0.7); border-top: 1px solid rgba(247,244,238,0.2); padding-top: 28px;
}
.aiwork-canvas .slide-title .footnote .left { max-width: 920px; line-height: 1.5; }
.aiwork-canvas .slide-title .footnote .built {
  display: flex; gap: 14px; align-items: center; font-size: 24px;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.aiwork-canvas .slide-title .footnote .built .pill {
  border: 1px solid rgba(247,244,238,0.35); padding: 8px 14px; border-radius: 999px;
}

/* 02 — Upfront */
.aiwork-canvas .slide-upfront { padding-top: 110px; }
.aiwork-canvas .slide-upfront .grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 120px;
  align-items: start; margin-top: 60px; flex: 1;
}
.aiwork-canvas .slide-upfront ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 28px; }
.aiwork-canvas .slide-upfront li {
  font-family: var(--font-serif); font-size: 34px; line-height: 1.32;
  padding-left: 56px; position: relative;
}
.aiwork-canvas .slide-upfront li::before {
  content: ""; position: absolute; left: 0; top: 22px;
  width: 32px; height: 2px; background: var(--rust);
}
.aiwork-canvas .slide-upfront .takeaway {
  background: var(--ink); color: var(--cream); padding: 56px 56px 60px; border-radius: 4px;
  align-self: stretch; display: flex; flex-direction: column; justify-content: space-between; min-height: 480px;
}
.aiwork-canvas .slide-upfront .takeaway .label {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em;
  text-transform: uppercase; color: rgba(247,244,238,0.6);
}
.aiwork-canvas .slide-upfront .takeaway .big {
  font-family: var(--font-sans); font-weight: 500; font-size: 64px;
  line-height: 1.08; letter-spacing: -0.02em; margin: 32px 0 0;
}
.aiwork-canvas .slide-upfront .takeaway .big em {
  font-style: italic; font-family: var(--font-serif); font-weight: 400; color: var(--gold);
}
.aiwork-canvas .slide-upfront .takeaway .end {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.04em;
  color: rgba(247,244,238,0.7); margin-top: 28px;
}

/* 03 — What changed */
.aiwork-canvas .slide-changed { padding-top: 110px; }
.aiwork-canvas .slide-changed .header { display: flex; gap: 24px; align-items: baseline; }
.aiwork-canvas .slide-changed h1.title { margin-top: 24px; max-width: 1700px; }
.aiwork-canvas .slide-changed .body-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
  margin-top: 80px; flex: 1; align-items: start;
}
.aiwork-canvas .slide-changed .col-left p {
  font-family: var(--font-serif); font-size: 40px; line-height: 1.28; margin: 0 0 28px;
}
.aiwork-canvas .slide-changed .compare {
  display: grid; grid-template-rows: 1fr 1fr; gap: 0; height: 100%;
}
.aiwork-canvas .slide-changed .compare .row {
  padding: 36px 44px; display: flex; flex-direction: column; justify-content: center; gap: 16px;
}
.aiwork-canvas .slide-changed .compare .row.before { background: var(--cream-2); }
.aiwork-canvas .slide-changed .compare .row.after { background: var(--ink); color: var(--cream); }
.aiwork-canvas .slide-changed .compare .row .lbl {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em;
  text-transform: uppercase; opacity: 0.7;
}
.aiwork-canvas .slide-changed .compare .row .val {
  font-family: var(--font-sans); font-weight: 500; font-size: 44px;
  line-height: 1.18; letter-spacing: -0.015em;
}
.aiwork-canvas .slide-changed .compare .row .val .arrow { color: var(--rust); }
.aiwork-canvas .slide-changed .compare .row.after .val .arrow { color: var(--gold); }

/* 04 — Where I use it */
.aiwork-canvas .slide-where { padding-top: 90px; padding-bottom: 80px; }
.aiwork-canvas .slide-where .header {
  display: grid; grid-template-columns: 1fr auto; gap: 80px;
  align-items: end; margin-bottom: 56px;
}
.aiwork-canvas .slide-where .table {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border-top: 1px solid var(--ink); flex: 1;
}
.aiwork-canvas .slide-where .cell {
  padding: 40px 48px 44px; border-bottom: 1px solid var(--rule);
  display: flex; flex-direction: column; gap: 16px; position: relative;
}
.aiwork-canvas .slide-where .cell:nth-child(odd) { border-right: 1px solid var(--rule); }
.aiwork-canvas .slide-where .cell .num {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em; color: var(--ink-soft);
}
.aiwork-canvas .slide-where .cell h3 {
  font-family: var(--font-sans); font-weight: 600; font-size: 40px;
  line-height: 1.1; letter-spacing: -0.015em; margin: 0;
}
.aiwork-canvas .slide-where .cell .use {
  font-family: var(--font-serif); font-size: 26px; line-height: 1.34; margin: 0; color: var(--ink);
}
.aiwork-canvas .slide-where .cell .watch {
  margin-top: auto; display: flex; gap: 16px; align-items: flex-start;
  padding-top: 16px; border-top: 1px dashed var(--rule);
}
.aiwork-canvas .slide-where .cell .watch .tag {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--rust); white-space: nowrap; padding-top: 4px;
}
.aiwork-canvas .slide-where .cell .watch p {
  font-size: 24px; line-height: 1.34; margin: 0; color: var(--ink-soft);
}

/* 05 — Question */
.aiwork-canvas .slide-question { padding-top: 100px; }
.aiwork-canvas .slide-question .header { margin-bottom: 60px; }
.aiwork-canvas .slide-question .pair {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0; flex: 1;
  align-self: stretch; border-top: 1px solid var(--rule);
}
.aiwork-canvas .slide-question .pane {
  padding: 44px 56px 0; display: flex; flex-direction: column; gap: 28px; position: relative;
}
.aiwork-canvas .slide-question .pane.vague { background: var(--cream); border-right: 1px solid var(--rule); }
.aiwork-canvas .slide-question .pane.specific { background: var(--ink); color: var(--cream); }
.aiwork-canvas .slide-question .pane .lbl {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em; text-transform: uppercase;
}
.aiwork-canvas .slide-question .pane.vague .lbl { color: var(--ink-soft); }
.aiwork-canvas .slide-question .pane.specific .lbl { color: var(--gold); }
.aiwork-canvas .slide-question .prompt {
  font-family: var(--font-mono); font-size: 24px; line-height: 1.45;
  padding: 24px 28px; background: var(--cream-2);
  border-left: 3px solid var(--rust); color: var(--ink);
}
.aiwork-canvas .slide-question .pane.specific .prompt {
  background: rgba(247,244,238,0.07); border-left-color: var(--gold); color: var(--cream);
}
.aiwork-canvas .slide-question .out {
  font-family: var(--font-serif); font-size: 28px; line-height: 1.34; margin: 0;
}
.aiwork-canvas .slide-question .verdict {
  font-family: var(--font-sans); font-weight: 500; font-size: 30px;
  line-height: 1.22; letter-spacing: -0.01em; margin-top: auto;
  padding: 28px 0 36px; border-top: 1px solid var(--rule);
}
.aiwork-canvas .slide-question .pane.specific .verdict { border-top-color: rgba(247,244,238,0.2); }
.aiwork-canvas .slide-question .pane.vague .verdict { color: var(--rust); }
.aiwork-canvas .slide-question .pane.specific .verdict { color: var(--gold); }

/* 06 — Conversation */
.aiwork-canvas .slide-convo { padding-top: 110px; }
.aiwork-canvas .slide-convo .header { margin-bottom: 56px; }
.aiwork-canvas .slide-convo .thread {
  display: flex; flex-direction: column; gap: 22px; flex: 1; max-width: 1500px;
}
.aiwork-canvas .slide-convo .turn {
  display: grid; grid-template-columns: 80px 1fr 1fr; gap: 36px; align-items: start;
}
.aiwork-canvas .slide-convo .turn .n {
  font-family: var(--font-mono); font-size: 30px; font-weight: 500;
  color: var(--rust); padding-top: 12px;
}
.aiwork-canvas .slide-convo .turn .prompt {
  font-family: var(--font-mono); font-size: 24px; line-height: 1.42;
  padding: 18px 24px; background: var(--paper);
  border: 1px solid var(--rule); border-radius: 6px;
}
.aiwork-canvas .slide-convo .turn .verdict {
  font-family: var(--font-serif); font-size: 26px; line-height: 1.34;
  padding-top: 14px; color: var(--ink-soft);
}
.aiwork-canvas .slide-convo .turn.done .verdict { color: var(--olive); font-weight: 500; }
.aiwork-canvas .slide-convo .punchline {
  margin-top: 56px; padding-top: 36px; border-top: 1px solid var(--rule);
  font-family: var(--font-sans); font-weight: 500; font-size: 44px;
  line-height: 1.18; letter-spacing: -0.018em;
}
.aiwork-canvas .slide-convo .punchline em {
  font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--rust);
}

/* 07 — Live demo */
.aiwork-canvas .slide-demo {
  background: var(--rust); color: var(--cream);
  align-items: center; justify-content: center; text-align: center; position: relative;
}
.aiwork-canvas .slide-demo .eyebrow { color: rgba(247,244,238,0.7); }
.aiwork-canvas .slide-demo .eyebrow .dot { background: var(--gold); }
.aiwork-canvas .slide-demo h1 {
  font-family: var(--font-sans); font-weight: 600; font-size: 168px;
  line-height: 1.08; letter-spacing: -0.035em; margin: 56px 0 0; padding-bottom: 40px;
}
.aiwork-canvas .slide-demo h1 em { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--gold); }
.aiwork-canvas .slide-demo .sub {
  font-family: var(--font-serif); font-size: 42px; line-height: 1.28;
  margin: 120px auto 0; max-width: 1300px;
}
.aiwork-canvas .slide-demo .corners {
  position: absolute; inset: 56px 56px;
  border: 1px solid rgba(247,244,238,0.25); pointer-events: none;
}

/* 08 — Value prop */
.aiwork-canvas .slide-valueprop { padding-top: 100px; }
.aiwork-canvas .slide-valueprop .header { margin-bottom: 50px; }
.aiwork-canvas .slide-valueprop .body-grid {
  display: grid; grid-template-columns: 1fr 1.1fr; gap: 80px; flex: 1; align-items: start;
}
.aiwork-canvas .slide-valueprop .narrative p {
  font-family: var(--font-serif); font-size: 30px; line-height: 1.36; margin: 0 0 24px;
}
.aiwork-canvas .slide-valueprop .narrative .quote {
  margin-top: 36px; padding: 28px 32px; border-left: 3px solid var(--rust);
  background: var(--paper); font-family: var(--font-serif);
  font-style: italic; font-size: 30px; line-height: 1.34;
}
.aiwork-canvas .slide-valueprop .personas { display: flex; flex-direction: column; gap: 20px; }
.aiwork-canvas .slide-valueprop .persona {
  background: var(--paper); border: 1px solid var(--rule);
  padding: 26px 32px; display: grid; grid-template-columns: 220px 1fr;
  gap: 32px; align-items: center;
}
.aiwork-canvas .slide-valueprop .persona .role {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-soft);
}
.aiwork-canvas .slide-valueprop .persona .role .num {
  display: block; font-size: 24px; color: var(--rust); margin-bottom: 6px;
}
.aiwork-canvas .slide-valueprop .persona .qs { display: flex; flex-direction: column; gap: 8px; }
.aiwork-canvas .slide-valueprop .persona .qs .q {
  font-family: var(--font-serif); font-size: 26px; line-height: 1.3;
}

/* 09 — Building */
.aiwork-canvas .slide-building { padding-top: 100px; padding-bottom: 80px; }
.aiwork-canvas .slide-building .header { margin-bottom: 16px; }
.aiwork-canvas .slide-building .lede {
  font-family: var(--font-serif); font-size: 30px; line-height: 1.36;
  color: var(--ink-soft); margin: 0 0 48px; max-width: 1400px;
}
.aiwork-canvas .slide-building .lede em { color: var(--rust); font-style: italic; }
.aiwork-canvas .slide-building .grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; flex: 1;
}
.aiwork-canvas .slide-building .card {
  background: var(--paper); border: 1px solid var(--rule);
  padding: 36px 36px 32px; display: flex; flex-direction: column;
  gap: 18px; position: relative;
}
.aiwork-canvas .slide-building .card .num {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em; color: var(--rust);
}
.aiwork-canvas .slide-building .card .codename {
  font-family: var(--font-script); font-size: 44px; line-height: 1;
  color: var(--ink-2); margin-top: -8px;
}
.aiwork-canvas .slide-building .card h3 {
  font-family: var(--font-serif); font-weight: 700; font-size: 30px;
  line-height: 1.18; letter-spacing: -0.01em; margin: 4px 0 0; color: var(--ink);
}
.aiwork-canvas .slide-building .card p {
  font-family: var(--font-sans); font-size: 24px; line-height: 1.42; color: var(--ink-soft); margin: 0;
}
.aiwork-canvas .slide-building .card .shift {
  margin-top: auto; padding-top: 24px; border-top: 1px solid var(--rule);
  display: flex; align-items: center; gap: 14px;
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.04em;
}
.aiwork-canvas .slide-building .card .shift .from { color: var(--ink-soft); }
.aiwork-canvas .slide-building .card .shift .arrow { color: var(--rust); font-size: 26px; }
.aiwork-canvas .slide-building .card .shift .to { color: var(--ink); font-weight: 600; }

/* 10 — Starting prompts */
.aiwork-canvas .slide-starts { padding-top: 100px; }
.aiwork-canvas .slide-starts .header { margin-bottom: 50px; }
.aiwork-canvas .slide-starts .grid {
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
  gap: 28px; flex: 1;
}
.aiwork-canvas .slide-starts .card {
  background: var(--paper); border: 1px solid var(--rule);
  padding: 32px 36px; display: flex; flex-direction: column;
  gap: 18px; position: relative;
}
.aiwork-canvas .slide-starts .card .label {
  display: flex; align-items: baseline; gap: 16px;
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-soft);
}
.aiwork-canvas .slide-starts .card .label .num { color: var(--rust); }
.aiwork-canvas .slide-starts .card h3 {
  font-family: var(--font-sans); font-weight: 600; font-size: 32px;
  line-height: 1.1; letter-spacing: -0.015em; margin: 0;
}
.aiwork-canvas .slide-starts .card .prompt {
  font-family: var(--font-mono); font-size: 24px; line-height: 1.42;
  background: var(--cream-2); padding: 18px 22px; margin-top: auto; white-space: pre-wrap;
}
.aiwork-canvas .slide-starts .card .prompt .blank {
  background: var(--ink); color: var(--cream);
  padding: 2px 8px; border-radius: 2px;
}

/* 11 — Bridge */
.aiwork-canvas .slide-bridge { background: var(--ink); color: var(--cream); justify-content: center; }
.aiwork-canvas .slide-bridge .kicker { color: var(--gold); }
.aiwork-canvas .slide-bridge h1 {
  font-family: var(--font-sans); font-weight: 600; font-size: 168px;
  line-height: 0.94; letter-spacing: -0.035em; margin: 40px 0 0; max-width: 1700px;
}
.aiwork-canvas .slide-bridge h1 em {
  font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--gold);
}
.aiwork-canvas .slide-bridge .sub {
  font-family: var(--font-serif); font-size: 44px; line-height: 1.28;
  margin: 48px 0 0; max-width: 1400px; color: rgba(247,244,238,0.8);
}

/* 12 — How built */
.aiwork-canvas .slide-how { padding-top: 90px; padding-bottom: 80px; }
.aiwork-canvas .slide-how .header { margin-bottom: 40px; }
.aiwork-canvas .slide-how .grid {
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 64px; flex: 1; align-items: stretch;
}
.aiwork-canvas .slide-how .tools { display: flex; flex-direction: column; gap: 0; }
.aiwork-canvas .slide-how .tool {
  display: grid; grid-template-columns: 280px 1fr; gap: 36px;
  padding: 26px 0; border-bottom: 1px solid var(--rule); align-items: center;
}
.aiwork-canvas .slide-how .tool:first-child { border-top: 1px solid var(--rule); }
.aiwork-canvas .slide-how .tool .name {
  font-family: var(--font-sans); font-weight: 600; font-size: 38px; letter-spacing: -0.015em;
}
.aiwork-canvas .slide-how .tool .name .dot {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 50%; margin-right: 14px; vertical-align: 4px;
}
.aiwork-canvas .slide-how .tool .role {
  font-family: var(--font-serif); font-size: 26px; line-height: 1.32; color: var(--ink-soft);
}
.aiwork-canvas .slide-how .tool .role em { color: var(--ink); font-style: italic; }
.aiwork-canvas .slide-how .side {
  background: var(--ink); color: var(--cream);
  padding: 40px 44px; display: flex; flex-direction: column; gap: 28px;
}
.aiwork-canvas .slide-how .side .lbl {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--gold);
}
.aiwork-canvas .slide-how .side ul {
  list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column;
  gap: 14px; font-size: 24px; line-height: 1.4; color: rgba(247,244,238,0.82);
}
.aiwork-canvas .slide-how .side ul li {
  display: grid; grid-template-columns: 130px 1fr; gap: 16px;
}
.aiwork-canvas .slide-how .side ul li .k {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.16em;
  text-transform: uppercase; color: rgba(247,244,238,0.55); padding-top: 3px;
}
.aiwork-canvas .slide-how .side .punch {
  margin-top: auto; padding-top: 24px;
  border-top: 1px solid rgba(247,244,238,0.18);
  font-family: var(--font-serif); font-style: italic;
  font-size: 26px; line-height: 1.32; color: var(--cream);
}
.aiwork-canvas .slide-how .side .punch strong {
  display: block; font-style: normal;
  font-family: var(--font-sans); font-weight: 500; color: var(--gold); margin-top: 6px;
}

/* 13 — Start this week */
.aiwork-canvas .slide-start { padding-top: 100px; }
.aiwork-canvas .slide-start .header { margin-bottom: 60px; }
.aiwork-canvas .slide-start .ladder {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
  border-top: 1px solid var(--ink); flex: 1;
}
.aiwork-canvas .slide-start .step {
  padding: 140px 48px 36px; display: flex; flex-direction: column;
  gap: 28px; border-right: 1px solid var(--rule); position: relative;
}
.aiwork-canvas .slide-start .step:last-child { border-right: none; }
.aiwork-canvas .slide-start .step .when {
  font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--rust);
}
.aiwork-canvas .slide-start .step h3 {
  font-family: var(--font-sans); font-weight: 600; font-size: 44px;
  line-height: 1.1; letter-spacing: -0.02em; margin: 0;
}
.aiwork-canvas .slide-start .step p {
  font-family: var(--font-serif); font-size: 26px; line-height: 1.36;
  margin: 0; color: var(--ink-soft);
}
.aiwork-canvas .slide-start .step .marker {
  position: absolute; top: 44px; left: 48px;
  font-family: var(--font-mono); font-size: 60px; font-weight: 300;
  color: var(--cream-2); line-height: 1;
}
.aiwork-canvas .slide-start .ask {
  margin-top: 40px; font-family: var(--font-serif);
  font-style: italic; font-size: 32px; color: var(--ink-soft);
}
.aiwork-canvas .slide-start .ask strong {
  font-style: normal; font-weight: 500; color: var(--ink);
}

/* 14 — Closing */
.aiwork-canvas .slide-close {
  background: var(--cream); justify-content: center;
  padding-left: 180px; padding-right: 180px;
}
.aiwork-canvas .slide-close .quote-mark {
  font-family: var(--font-serif); font-size: 220px;
  line-height: 0.7; color: var(--rust); margin-bottom: 32px;
}
.aiwork-canvas .slide-close blockquote {
  margin: 0; font-family: var(--font-serif); font-size: 92px;
  line-height: 1.08; letter-spacing: -0.018em; font-weight: 400;
  max-width: 1500px; text-wrap: balance;
}
.aiwork-canvas .slide-close blockquote em { font-style: italic; color: var(--rust); }
.aiwork-canvas .slide-close .ask {
  margin-top: 80px; padding-top: 40px; border-top: 1px solid var(--ink);
  display: flex; justify-content: space-between; align-items: baseline; gap: 80px;
  font-family: var(--font-sans); font-weight: 500; font-size: 44px;
  line-height: 1.2; letter-spacing: -0.015em; max-width: 1500px;
}
.aiwork-canvas .slide-close .ask .right {
  font-family: var(--font-mono); font-size: 24px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-soft); white-space: nowrap; font-weight: 500;
}

.aiwork-canvas .s-header { display: flex; flex-direction: column; gap: 24px; }

.aiwork-canvas .dot-strip {
  position: absolute;
  background-image: radial-gradient(circle, currentColor 1.6px, transparent 2.2px);
  background-size: 18px 18px; background-position: 0 0; pointer-events: none;
}
.aiwork-canvas .dot-strip.left { left: 0; top: 0; bottom: 0; width: 162px; }
.aiwork-canvas .dot-strip.bottom { left: 0; right: 0; bottom: 0; height: 162px; }

.aiwork-canvas .signature {
  font-family: var(--font-script); font-weight: 500; color: var(--ink-2);
}
`;

const FONT_LINK_ID = "aiwork-google-fonts";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500&family=Caveat:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";

function Slide01Title() {
  return (
    <section className="slide-title">
      <span
        className="dot-strip left"
        style={{ color: "rgba(247,244,238,0.18)", top: "auto", bottom: 0, height: "360px" }}
      />
      <div className="top-row">
        <div className="brand">
          <span className="mark" />
          <span>Palsgaard&nbsp;·&nbsp;CD&amp;M Team</span>
        </div>
        <div>April 2026 · Internal</div>
      </div>

      <h1>
        How I <em>actually</em>
        <br />
        use AI at work.
      </h1>

      <div className="footnote">
        <div className="left">
          This presentation was built using Claude, GPT, CoPilot and Base44.
          <br />
          That is part of the story.
        </div>
        <div className="built">
          <span className="pill">Claude</span>
          <span className="pill">GPT</span>
          <span className="pill">CoPilot</span>
          <span className="pill">Base44</span>
        </div>
      </div>
    </section>
  );
}

function Slide02Upfront() {
  return (
    <section className="slide-upfront">
      <div className="s-header">
        <div className="eyebrow">
          <span className="dot" />
          01 · Before we start
        </div>
        <h1 className="title">Let me be clear upfront.</h1>
      </div>

      <div className="grid">
        <ul>
          <li>
            This is <span className="rust">not a pitch</span> for AI.
          </li>
          <li>I'm not here to tell you AI is the future.</li>
          <li>I'm here to show you what I actually do with it on a Tuesday morning.</li>
          <li>Some of it is useful. Some of it isn't. I'll be honest about both.</li>
        </ul>

        <div className="takeaway">
          <div className="label">What I want you to leave with</div>
          <div className="big">
            <em>One task</em> you want to&nbsp;try this&nbsp;with.
          </div>
          <div className="end">— That's it.</div>
        </div>
      </div>
    </section>
  );
}

function Slide03Changed() {
  return (
    <section className="slide-changed">
      <div className="s-header">
        <div className="eyebrow">
          <span className="dot" />
          02 · The shift
        </div>
        <h1 className="title">The thing that actually changed.</h1>
      </div>

      <div className="body-grid">
        <div className="col-left">
          <p>I used to start from a blank page.</p>
          <p>
            Now I start from <span className="rust">something I can react to</span>.
          </p>
          <p
            style={{
              fontSize: 30,
              fontFamily: "var(--font-sans)",
              color: "var(--ink-soft)",
              marginTop: 40,
              lineHeight: 1.4,
            }}
          >
            Not because AI is good at writing — it isn't, really. But I'm better at knowing what's
            wrong than knowing what to write. So now I edit. And editing is faster than creating.
          </p>
        </div>

        <div className="compare">
          <div className="row before">
            <div className="lbl">Before</div>
            <div className="val">
              Blank page <span className="arrow">→</span> draft
            </div>
          </div>
          <div className="row after">
            <div className="lbl">Now</div>
            <div className="val">
              Draft <span className="arrow">→</span> edits
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slide04Where() {
  const cells = [
    {
      num: "01",
      title: "Campaign messaging",
      use: "Four angles in ten minutes — instead of two days of internal alignment. Then I cut half of it.",
      watch: "It always oversells. You have to push back hard.",
    },
    {
      num: "02",
      title: "Trade show follow-up",
      use: "I paste in my booth notes and get a structured summary per lead. Sales gets it the same day.",
      watch: "It can't tell you who is actually worth following up on. That's still yours.",
    },
    {
      num: "03",
      title: "PR and messaging",
      use: "It gives me three angles I wouldn't have thought of. I kill two. One survives.",
      watch: "It loves buzzwords. Edit ruthlessly.",
    },
    {
      num: "04",
      title: "Internal comms",
      use: "I ask it to rewrite technical language into something commercial teams can actually use. Surprisingly good.",
      watch: "It doesn't know the politics. You still have to read the room.",
    },
  ];
  return (
    <section className="slide-where">
      <div className="header">
        <div className="s-header">
          <div className="eyebrow">
            <span className="dot" />
            03 · Day-to-day use
          </div>
          <h1 className="title">
            Where I use it — and where
            <br />
            I've learned not to trust it.
          </h1>
        </div>
        <div className="kicker">Four real cases</div>
      </div>

      <div className="table">
        {cells.map((c) => (
          <div className="cell" key={c.num}>
            <div className="num">{c.num}</div>
            <h3>{c.title}</h3>
            <p className="use">{c.use}</p>
            <div className="watch">
              <div className="tag">Watch out</div>
              <p>{c.watch}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Slide05Question() {
  return (
    <section className="slide-question">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          04 · The one thing I wish I'd known sooner
        </div>
        <h1 className="title">
          The quality of the answer depends on the quality&nbsp;of&nbsp;the question.
        </h1>
      </div>

      <div className="pair">
        <div className="pane vague">
          <div className="lbl">Vague brief</div>
          <div className="prompt">"Build an app to register leads at trade shows."</div>
          <p className="out">→ Name, email, company, notes. A generic contact form.</p>
          <div className="verdict">Useless at an actual booth.</div>
        </div>

        <div className="pane specific">
          <div className="lbl">Specific brief</div>
          <div className="prompt">
            "Salespeople register leads in 2 minutes at a booth. They need: photo of business card,
            voice note, lead grade A/B/C, follow-up owner, sync to CRM, GDPR consent."
          </div>
          <p className="out">→ A 40-field app.</p>
          <div className="verdict">We used it at a live trade show.</div>
        </div>
      </div>
    </section>
  );
}

function Slide06Convo() {
  const turns = [
    { n: "01", prompt: '"Write a LinkedIn post about bakery reformulation."', verdict: "Too broad. Sounds like anyone." },
    { n: "02", prompt: '"Focus on egg reduction. Audience: R&D managers. Sentence case, no fluff."', verdict: "Better angle. Still a bit long." },
    { n: "03", prompt: '"Shorten to 100 words. Remove em dashes."', verdict: "Right length. Right register." },
    { n: "04", prompt: '"End with a link to our bakery page — not a question."', verdict: "Done. Ready to post.", done: true },
  ];
  return (
    <section className="slide-convo">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          05 · How it actually works
        </div>
        <h1 className="title">It's never one prompt. It's a conversation.</h1>
      </div>

      <div className="thread">
        {turns.map((t) => (
          <div className={`turn${t.done ? " done" : ""}`} key={t.n}>
            <div className="n">{t.n}</div>
            <div className="prompt">{t.prompt}</div>
            <div className="verdict">{t.verdict}</div>
          </div>
        ))}
      </div>

      <div className="punchline">
        The tool didn't get smarter. <em>The question did.</em>
      </div>
    </section>
  );
}

function Slide07Demo() {
  return (
    <section className="slide-demo">
      <div className="corners" />
      <div className="eyebrow">
        <span className="dot" />
        06 · Live
      </div>
      <h1>
        Let me <em>show&nbsp;you</em>.
      </h1>
      <div className="sub">
        Throw me a topic we're working on now.
        <br />
        We'll prompt our way through it together.
      </div>
    </section>
  );
}

function Slide08ValueProp() {
  return (
    <section className="slide-valueprop">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          07 · Something I didn't expect
        </div>
        <h1 className="title">
          Stress-testing a value prop before&nbsp;it&nbsp;reaches a customer.
        </h1>
      </div>

      <div className="body-grid">
        <div className="narrative">
          <p>I paste in our positioning and ask it to react as if it were procurement. Then R&amp;D. Then sales.</p>
          <p>
            It's not perfect. But it finds the weak spots{" "}
            <span className="rust">faster than I do sitting alone</span>.
          </p>

          <div className="quote">
            Once it told me we were leading with sustainability — when the real buying driver was{" "}
            <strong>cost and supply security</strong>. We changed the story.
          </div>

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 24,
              color: "var(--ink-soft)",
              marginTop: 32,
              lineHeight: 1.4,
            }}
          >
            It's good at simulating perspectives. It's not good at knowing what actually drives the
            decision. That part is still yours.
          </p>
        </div>

        <div className="personas">
          <div className="persona">
            <div className="role">
              <span className="num">01</span>Procurement
            </div>
            <div className="qs">
              <div className="q">"Where is the cost saving?"</div>
              <div className="q">"What is the switching risk?"</div>
            </div>
          </div>
          <div className="persona">
            <div className="role">
              <span className="num">02</span>R&amp;D
            </div>
            <div className="qs">
              <div className="q">"What happens to process stability?"</div>
              <div className="q">"Do we need to reformulate?"</div>
            </div>
          </div>
          <div className="persona">
            <div className="role">
              <span className="num">03</span>Sales
            </div>
            <div className="qs">
              <div className="q">"How do I explain this simply?"</div>
              <div className="q">"What's the proof point?"</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slide09Building() {
  return (
    <section className="slide-building">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          08 · From sandbox to team
        </div>
        <h1 className="title">What I&rsquo;m building right&nbsp;now.</h1>
      </div>
      <p className="lede">
        Three real projects on my desk. Different problems &mdash; <em>same shift</em>: from my
        personal sandbox to something the team can actually use.
      </p>

      <div className="grid">
        <div className="card">
          <div className="num">01</div>
          <div className="codename">AI Skill Library</div>
          <h3>From my laptop to the team&rsquo;s Microsoft&nbsp;365.</h3>
          <p>
            Thirteen specialised Claude skills built for our marketing work &mdash; tone of voice,
            campaigns, KPI reports, slide generation. Useful. But only used by me.
          </p>
          <div className="shift">
            <span className="from">Claude (mine)</span>
            <span className="arrow">&rarr;</span>
            <span className="to">M365 / Copilot</span>
          </div>
        </div>

        <div className="card">
          <div className="num">02</div>
          <div className="codename">Campaign OS</div>
          <h3>AI as a co-worker on the campaign &mdash; not a chatbot.</h3>
          <p>
            A live workspace in Base44 with Claude as the engine. Dashboard, asset editor,
            versioning, approvals. Next: validator agents that review tone, brand fit, KPI logic.
          </p>
          <div className="shift">
            <span className="from">Brief in a doc</span>
            <span className="arrow">&rarr;</span>
            <span className="to">Living workspace</span>
          </div>
        </div>

        <div className="card">
          <div className="num">03</div>
          <div className="codename">NPD Workflow</div>
          <h3>One input. Both the business case and the launch deck.</h3>
          <p>
            Today we write the business case from scratch, then build the launch deck separately.
            Same data, twice the work. The workflow produces both from one structured brief.
          </p>
          <div className="shift">
            <span className="from">Two manual flows</span>
            <span className="arrow">&rarr;</span>
            <span className="to">One source</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slide10Starts() {
  const cards = [
    {
      num: "01",
      area: "Portfolio & price",
      h3: "Turn a feature into a pricing argument.",
      prompt: (
        <>
          "I'm positioning <span className="blank">[product]</span> vs{" "}
          <span className="blank">[alternative]</span>. Translate this feature into a pricing
          argument for procurement. What's missing? Output: 3 bullets."
        </>
      ),
    },
    {
      num: "02",
      area: "Distributor engagement",
      h3: "Pre-empt the questions you'll get.",
      prompt: (
        <>
          "We're changing <span className="blank">[product / offering]</span>. What will a
          distributor ask? Give me 3 operational impacts and a suggested response to each."
        </>
      ),
    },
    {
      num: "03",
      area: "New product development",
      h3: "Translate the tech into three benefits.",
      prompt: (
        <>
          "Here is the technical description of <span className="blank">[product]</span>. Explain
          it as: one operational benefit, one financial, one sustainability. Max 2 lines each."
        </>
      ),
    },
    {
      num: "04",
      area: "Go-to-market",
      h3: "Adapt the message for two markets.",
      prompt: (
        <>
          "Here's our core message: <span className="blank">[paste]</span>. Adapt it for a mature
          European market and an emerging market. Max 5 lines each. Show what changes and why."
        </>
      ),
    },
  ];
  return (
    <section className="slide-starts">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          09 · Something concrete for each of you
        </div>
        <h1 className="title">A starting prompt for your&nbsp;role — copy and fill&nbsp;in.</h1>
      </div>

      <div className="grid">
        {cards.map((c) => (
          <div className="card" key={c.num}>
            <div className="label">
              <span className="num">{c.num}</span>
              <span>{c.area}</span>
            </div>
            <h3>{c.h3}</h3>
            <div className="prompt">{c.prompt}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Slide11Bridge() {
  return (
    <section className="slide-bridge">
      <div className="kicker">— One more thing</div>
      <h1>
        This deck was&nbsp;built
        <br />
        with <em>AI</em>.
      </h1>
      <div className="sub">
        Let me show you how. The <em>how</em> is more interesting than the slides.
      </div>
    </section>
  );
}

function Slide12How() {
  return (
    <section className="slide-how">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          10 · Behind the deck
        </div>
        <h1 className="title">
          Four tools. One brief.
          <br />
          Thirteen rounds of back-and-forth.
        </h1>
      </div>

      <div className="grid">
        <div className="tools">
          <div className="tool">
            <div className="name">
              <span className="dot" style={{ background: "var(--rust)" }} />
              Claude
            </div>
            <div className="role">
              Structure, iteration, built most of the slides. <em>13 rounds.</em>
            </div>
          </div>
          <div className="tool">
            <div className="name">
              <span className="dot" style={{ background: "var(--gold)" }} />
              GPT
            </div>
            <div className="role">
              Pushed back on my framing.{" "}
              <em>"This will still be polished fluff unless you force before/after."</em>
            </div>
          </div>
          <div className="tool">
            <div className="name">
              <span className="dot" style={{ background: "var(--sage)" }} />
              CoPilot
            </div>
            <div className="role">
              Role-specific prompts on slide nine.{" "}
              <em>"We debate ideas, not drafts" — came from here.</em>
            </div>
          </div>
          <div className="tool">
            <div className="name">
              <span className="dot" style={{ background: "var(--olive)" }} />
              Base44 superagent
            </div>
            <div className="role">The trade show app and trend analysis. Real builds, not hypotheticals.</div>
          </div>
        </div>

        <div className="side">
          <div>
            <div className="lbl">The brief I gave</div>
            <ul style={{ marginTop: 18 }}>
              <li>
                <span className="k">Audience</span>
                <span>This team — mixed comfort with AI</span>
              </li>
              <li>
                <span className="k">Goal</span>
                <span>Inspiration, not showcase</span>
              </li>
              <li>
                <span className="k">Format</span>
                <span>15–20 min, slides</span>
              </li>
              <li>
                <span className="k">Tone</span>
                <span>Plain language, honest about limits</span>
              </li>
            </ul>
          </div>

          <div className="punch">
            Same brief to four tools. Took the best from each. Merged. Iterated.
            <strong>I made the decisions. AI did the drafting.</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slide13Start() {
  return (
    <section className="slide-start">
      <div className="header s-header">
        <div className="eyebrow">
          <span className="dot" />
          11 · Your turn
        </div>
        <h1 className="title">How to start, without overthinking&nbsp;it.</h1>
      </div>

      <div className="ladder">
        <div className="step">
          <div className="marker">01</div>
          <div className="when">This week</div>
          <h3>Take something you already wrote.</h3>
          <p>Ask AI to make it shorter and clearer. See what it gives you.</p>
        </div>
        <div className="step">
          <div className="marker">02</div>
          <div className="when">Next week</div>
          <h3>Pick one recurring task. Write a proper brief.</h3>
          <p>Audience, objective, format, constraints. Iterate twice.</p>
        </div>
        <div className="step">
          <div className="marker">03</div>
          <div className="when">After that</div>
          <h3>If something works, save it. Share it.</h3>
          <p>One good prompt used by the whole team beats ten experiments no one else sees.</p>
        </div>
      </div>

      <div className="ask">
        If you want help getting started — <strong>ask me after this.</strong>
      </div>
    </section>
  );
}

function Slide14Close() {
  return (
    <section className="slide-close">
      <div className="quote-mark">“</div>
      <blockquote>
        AI doesn't make you smarter.
        <br />
        It makes <em>lazy thinking</em> visible.
        <br />
        The value is in how hard you push back.
      </blockquote>
      <div className="ask">
        <div>
          What&rsquo;s the task you keep putting&nbsp;off?
          <br />
          Start there.
        </div>
        <div
          className="signature"
          style={{
            fontSize: 54,
            transform: "rotate(-3deg)",
            color: "var(--ink-2)",
            whiteSpace: "nowrap",
          }}
        >
          Thank&nbsp;you.
        </div>
      </div>
      <span
        className="dot-strip bottom"
        style={{
          color: "var(--ink)",
          opacity: 0.45,
          height: 90,
          left: -10,
          right: "auto",
          width: 540,
        }}
      />
    </section>
  );
}

const SLIDES = [
  { label: "01 Title", Component: Slide01Title },
  { label: "02 Upfront", Component: Slide02Upfront },
  { label: "03 What changed", Component: Slide03Changed },
  { label: "04 Where I use it", Component: Slide04Where },
  { label: "05 The question", Component: Slide05Question },
  { label: "06 Conversation", Component: Slide06Convo },
  { label: "07 Live demo", Component: Slide07Demo },
  { label: "08 Value prop", Component: Slide08ValueProp },
  { label: "09 Building now", Component: Slide09Building },
  { label: "10 Starting prompts", Component: Slide10Starts },
  { label: "11 Bridge", Component: Slide11Bridge },
  { label: "12 How built", Component: Slide12How },
  { label: "13 How to start", Component: Slide13Start },
  { label: "14 Close", Component: Slide14Close },
];

const DESIGN_W = 1920;
const DESIGN_H = 1080;

export default function AIAtWork() {
  const [index, setIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const go = useCallback((delta) => {
    setIndex((i) => Math.max(0, Math.min(SLIDES.length - 1, i + delta)));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          go(-1);
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(SLIDES.length - 1);
          break;
        case "n":
        case "N":
          setShowNotes((v) => !v);
          break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            const n = parseInt(e.key, 10);
            setIndex(Math.min(SLIDES.length - 1, Math.max(0, n === 0 ? 9 : n - 1)));
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / DESIGN_W, h / DESIGN_H);
      setScale(s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="aiwork-root">
      <style>{DECK_CSS}</style>
      <div className="aiwork-stage" ref={stageRef}>
        <div className="aiwork-canvas" style={{ transform: `scale(${scale})` }}>
          {SLIDES.map(({ Component, label }, i) => (
            <div key={label} data-hidden={i !== index} style={{ position: "absolute", inset: 0 }}>
              <Component />
            </div>
          ))}
        </div>
      </div>

      {showNotes && (
        <div className="aiwork-notes">
          <div className="lbl">Speaker notes · {SLIDES[index].label}</div>
          {SPEAKER_NOTES[index]}
        </div>
      )}

      <div className="aiwork-overlay">
        <button aria-label="Previous slide" onClick={() => go(-1)}>‹</button>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
        <button aria-label="Next slide" onClick={() => go(1)}>›</button>
        <span className="hint">← → · N notes</span>
      </div>
    </div>
  );
}

/**
 * Pulse-Check Survey — Slack DM Sender
 *
 * Läuft jeden Dienstag via GitHub Actions.
 * Sendet nur in geraden Wochen (= jede 2. Woche).
 * Berechnet die aktuelle Runde automatisch anhand des Startdatums.
 */

const SLACK_BOT_TOKEN  = process.env.SLACK_BOT_TOKEN;
const SURVEY_URL       = process.env.SURVEY_URL;
const TEAM_MEMBER_IDS  = process.env.TEAM_MEMBER_IDS; // kommagetrennte Slack User IDs

// Startdatum der ersten Runde (Montag vor dem ersten Versand)
const START_DATE = new Date("2026-04-27T00:00:00Z").getTime();
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

function getCurrentRound() {
  const elapsed = Date.now() - START_DATE;
  return Math.max(1, Math.floor(elapsed / MS_PER_TWO_WEEKS) + 1);
}

function isSurveyWeek() {
  const weeksSinceStart = Math.floor((Date.now() - START_DATE) / MS_PER_WEEK);
  return weeksSinceStart % 2 === 0;
}

async function slackPost(endpoint, body) {
  const res = await fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error on ${endpoint}: ${data.error}`);
  return data;
}

async function sendDM(userId, round) {
  // DM-Kanal öffnen (funktioniert auch ohne vorherigen Kontakt)
  const { channel } = await slackPost("conversations.open", { users: userId });

  await slackPost("chat.postMessage", {
    channel: channel.id,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 Pulse-Check — Runde ${round}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Hey! Zeit für unseren zweiwöchentlichen Team-Check-in.\n\nDauert *unter 1 Minute*, ist vollständig anonym und hilft uns als Team wirklich weiter. Danke! 🙏",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "→ Zur Umfrage (1 Min.)", emoji: true },
            url: SURVEY_URL,
            style: "primary",
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Anonym · Runde ${round} · Alle Antworten zählen`,
          },
        ],
      },
    ],
  });

  console.log(`✓ DM gesendet an User ${userId}`);
}

async function main() {
  // Validierung
  if (!SLACK_BOT_TOKEN) throw new Error("SLACK_BOT_TOKEN fehlt");
  if (!SURVEY_URL)      throw new Error("SURVEY_URL fehlt");
  if (!TEAM_MEMBER_IDS) throw new Error("TEAM_MEMBER_IDS fehlt");

  const round = getCurrentRound();

  // Prüfen ob diese Woche eine Versandwoche ist
  const forceSend = process.env.FORCE_SEND === 'true';
  if (!forceSend && !isSurveyWeek()) {
    console.log(`Woche ${Math.floor((Date.now() - START_DATE) / MS_PER_WEEK)} — keine Versandwoche. Übersprungen.`);
    return;
  }

  console.log(`🚀 Starte Versand — Runde ${round}`);

  const members = TEAM_MEMBER_IDS.split(",").map((id) => id.trim()).filter(Boolean);
  console.log(`Empfänger: ${members.length} Mitarbeiter`);

  const results = await Promise.allSettled(members.map((id) => sendDM(id, round)));

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    failed.forEach((r) => console.error(`✗ Fehler: ${r.reason.message}`));
    process.exit(1);
  }

  console.log(`\n✅ Runde ${round} erfolgreich an ${members.length} Mitarbeiter gesendet.`);
}

main().catch((err) => {
  console.error("Fehler:", err.message);
  process.exit(1);
});

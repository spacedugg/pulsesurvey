name: Pulse-Check Survey senden

on:
  # Jeden Dienstag um 08:00 UTC = 10:00 Uhr Deutschland (CEST/Sommerzeit)
  # Im Winter (CET, UTC+1) bitte auf 09:00 UTC ändern
  schedule:
    - cron: "0 8 * * 2"

  # Manueller Trigger zum Testen — "Run workflow" in GitHub Actions
  workflow_dispatch:
    inputs:
      force_send:
        description: "Auch außerhalb der Versandwoche senden?"
        required: false
        default: "false"
        type: choice
        options:
          - "false"
          - "true"

jobs:
  send-survey:
    name: Survey per DM versenden
    runs-on: ubuntu-latest

    steps:
      - name: Repository auschecken
        uses: actions/checkout@v4

      - name: Node.js 20 einrichten
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Pulse-Check senden
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SURVEY_URL: ${{ vars.SURVEY_URL }}
          TEAM_MEMBER_IDS: ${{ vars.TEAM_MEMBER_IDS }}
          FORCE_SEND: ${{ github.event.inputs.force_send || 'false' }}
        run: node send-survey.js

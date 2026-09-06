# Windows Logs Analyzer

See **what happened on this PC**: who signed in, how long they stayed, what failed, and what changed.

Everything stays on your computer. Nothing is sent to the cloud.

## Open the app

Double-click `Start-EventLogAnalyzer.cmd`.

Then click **Read this PC**.

For failed passwords and lockouts, click **Use administrator**.

## What you can check

- Who signed in, and who tried and failed
- How long each person stayed signed in
- Everyone who has an account on this PC
- Deleted files, network / Wi-Fi changes, USB sticks
- Restarts, crashed apps, and newly installed programs

Pick a person in **Who**, then use **What happened** or the buttons under the filters.

## Save a copy

Click **Save a copy** to keep a CSV or JSON file.

You can also open a saved Windows log (`.evtx`) with **Open a file**.

## Optional web app

There is also a browser version of the same idea:

```bash
npm install
npm run dev
```

To build the desktop web wrapper:

```bash
npm run dist
```

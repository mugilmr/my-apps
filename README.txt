MY APPS - installable iPhone apps (PWA)
=======================================
Contents
  index.html          landing page with links to both apps
  expense/            Paisa Palette (expenses, payments, investments)
  habits/             Steady Habit Coach

Both apps store data on the phone only. Use "Back up or restore" in each
app's settings to keep a copy of your data somewhere safe.

HOST IT FREE ON GITHUB PAGES
  1. Create a new PUBLIC repository on GitHub, for example "my-apps".
  2. Upload everything in this folder to the root of the repository
     (drag and drop on the web, or git add/commit/push).
  3. Repository > Settings > Pages > Source: "Deploy from a branch",
     Branch: main, folder: / (root). Save.
  4. After a minute your apps are at
       https://<your-username>.github.io/my-apps/expense/
       https://<your-username>.github.io/my-apps/habits/

  Easier alternative with no GitHub: open https://app.netlify.com/drop,
  drag this whole folder onto the page, and use the link it gives you.

INSTALL ON IPHONE
  1. Open the link in Safari (not Chrome).
  2. Tap Share > Add to Home Screen > Add.
  3. Open the app from the new icon. It runs full screen and works offline.

NOTES
  - Open each app once while online so it can cache itself for offline use.
  - Use the app from its Home Screen icon. Data in Safari and data in the
    Home Screen app are stored separately on iOS.
  - If you ever update the files, bump the version name at the top of
    sw.js (for example paisa-v1 -> paisa-v2) so phones pick up the change.

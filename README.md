# DownFeed — Facebook Video & Photo Downloader (Fixed structure)

আগের ভার্সনে `public/` নামে একটা সাব-ফোল্ডার ছিল, যেটা GitHub ওয়েব আপলোডে ঠিকমতো যায়নি — তাই সাইটে "Cannot GET /" দেখাচ্ছিল। এই ভার্সনে সব ফাইল একদম ফ্ল্যাট (কোনো সাব-ফোল্ডার নেই), তাই আপলোডে ভুল হওয়ার সুযোগ নেই।

## GitHub রিপো ঠিক করার ধাপ
1. আপনার GitHub রিপোতে (`fbsave`) যান।
2. পুরোনো সব ফাইল/ফোল্ডার **ডিলিট** করুন (`server.js`, `package.json`, `public` ফোল্ডার — যা যা আছে সব)। একেকটা ফাইলে ঢুকে উপরে ডানদিকে trash আইকনে ক্লিক করে "Commit changes" দিলেই ডিলিট হয়ে যাবে।
3. এই zip-টা এক্সট্র্যাক্ট করুন। ভেতরে থাকা **৪টা ফাইলই** (`index.html`, `server.js`, `package.json`, `.gitignore`) — কোনো ফোল্ডার না — একসাথে সিলেক্ট করে GitHub-এর "Add file → Upload files" পেজে ড্র্যাগ করে ছেড়ে দিন।
4. "Commit changes" চাপুন।
5. Render নিজে থেকেই নতুন কমিট ধরে অটো-ডিপ্লয় শুরু করবে (Events ট্যাবে দেখতে পাবেন)। ২-৩ মিনিট পর সাইট রিফ্রেশ করে দেখুন।

## চালানো (লোকালি)
```bash
npm install
npm start
```
তারপর `http://localhost:3000`।

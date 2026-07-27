# DownFeed — Facebook Video & Photo Downloader

## এই ভার্সনে কী বদলেছে
- সাইটের সব লেখা এখন **ইংরেজিতে**।
- আগে সরাসরি Facebook স্ক্র্যাপ করে ভিডিও বের করা হতো, যেটা Render-এর ক্লাউড IP থেকে বারবার **400 এরর** দিচ্ছিল (Facebook-এর বট-ডিটেকশন)।
- এখন **RapidAPI-এর একটা থার্ড-পার্টি সার্ভিস** দিয়ে ভিডিও বের করা হয় (তারা এই ব্লকিং সমস্যাটা নিজেদের দিক থেকে হ্যান্ডেল করে) — অনেক বেশি নির্ভরযোগ্য।
- ছবি (Photo) বের করার জন্য এখনো আগের mbasic স্ক্র্যাপার ব্যাকআপ হিসেবে আছে।
- RapidAPI key সেট না করা থাকলে সাইট আপনাআপনি পুরোনো স্ক্র্যাপার দিয়েই চালানোর চেষ্টা করবে, ভাঙবে না।

## RapidAPI Key সেটআপ (৩ মিনিট লাগবে)
1. [rapidapi.com](https://rapidapi.com)-এ গিয়ে ফ্রি অ্যাকাউন্ট বানান।
2. এই API-টা খুঁজুন: **"Facebook Audio/Video Downloader"** (developer: mahmudulhasandev)। সরাসরি লিংক: `https://rapidapi.com/mahmudulhasandev/api/facebook-audio-video-downloader`
3. পেজে "Subscribe to Test" চাপুন, **Basic/Free** প্ল্যান বেছে নিন (কার্ড লাগতে পারে ভেরিফিকেশনের জন্য, কিন্তু ফ্রি টায়ারে চার্জ হবে না)।
4. সাবস্ক্রাইব করার পর ডানপাশে **"X-RapidAPI-Key"** নামে একটা লম্বা কোড দেখবেন — সেটা কপি করুন।
5. এবার Render ড্যাশবোর্ডে আপনার **fbsave** সার্ভিসে যান → বাম সাইডবারে **Environment** → **Add Environment Variable**:
   - Key: `RAPIDAPI_KEY`
   - Value: (৪ নম্বরে কপি করা কোডটা পেস্ট করুন)
6. Save করুন — Render নিজে থেকেই নতুন এই ভ্যারিয়েবল নিয়ে সার্ভিস রিস্টার্ট করবে।

## GitHub রিপো ঠিক করার ধাপ
1. আপনার GitHub রিপোতে (`fbsave`) যান।
2. পুরোনো সব ফাইল/ফোল্ডার **ডিলিট** করুন। একেকটা ফাইলে ঢুকে উপরে ডানদিকে trash আইকনে ক্লিক করে "Commit changes" দিলেই ডিলিট হয়ে যাবে।
3. এই zip এক্সট্র্যাক্ট করুন। ভেতরে থাকা **৫টা ফাইলই** (`index.html`, `server.js`, `package.json`, `.gitignore`, `README.md`) — কোনো ফোল্ডার না — একসাথে সিলেক্ট করে GitHub-এর "Add file → Upload files" পেজে ড্র্যাগ করে ছেড়ে দিন।
4. "Commit changes" চাপুন।
5. Render অটো-ডিপ্লয় করবে (Events ট্যাবে দেখা যাবে)। ২-৩ মিনিট পর সাইট রিফ্রেশ করে টেস্ট করুন।

## চালানো (লোকালি)
```bash
npm install
RAPIDAPI_KEY=your_key_here npm start
```
তারপর `http://localhost:3000`।

## এখনো সমস্যা হলে
- Render-এর **Logs** ট্যাবে গিয়ে দেখুন `RapidAPI extraction failed` বা `Scrape fallback failed` লেখা কোনো এরর আছে কিনা — থাকলে স্ক্রিনশট পাঠান।
- RapidAPI-এর ফ্রি টায়ারে সাধারণত মাসে সীমিত সংখ্যক রিকোয়েস্ট (quota) থাকে — অনেক টেস্ট করলে quota শেষ হয়ে যেতে পারে, তখন RapidAPI ড্যাশবোর্ডে গিয়ে ব্যবহার (usage) চেক করুন।

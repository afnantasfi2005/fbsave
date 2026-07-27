# DownFeed — Facebook Video & Photo Downloader

পাবলিক ফেসবুক পোস্ট/রিলস/ভিডিও লিংক পেস্ট করে ভিডিও (HD/SD) ও ছবি ডাউনলোড করার ওয়েবসাইট।

## স্ট্যাক
- **Frontend:** Plain HTML/CSS/JS (`public/index.html`)
- **Backend:** Node.js + Express (`server.js`)
- এক্সট্রা কোনো ডাটাবেজ বা API key লাগে না

## কিভাবে কাজ করে
ইউজার একটি Facebook পোস্ট/ভিডিও/রিলস লিংক পেস্ট করলে, সার্ভার সেই লিংকটাকে `mbasic.facebook.com` ভার্সনে রিকোয়েস্ট করে (এই ভার্সন হালকা HTML রিটার্ন করে যেখানে ভিডিও/ছবির আসল URL সরাসরি পেজের সোর্সে থাকে), এবং সেখান থেকে regex দিয়ে `hd_src`, `sd_src` ও ছবির URL বের করে ইউজারকে দেখায়।

## লোকালি রান করা
```bash
npm install
npm start
```
তারপর ব্রাউজারে `http://localhost:3000` খুলুন।

## ডিপ্লয় (GitHub + Render.com)
1. এই ফোল্ডারটা GitHub-এ একটা নতুন রিপোতে পুশ করুন:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: DownFeed"
   git branch -M main
   git remote add origin https://github.com/<your-username>/downfeed.git
   git push -u origin main
   ```
2. [render.com](https://render.com)-এ গিয়ে **New → Web Service** করুন এবং এই GitHub রিপোটা কানেক্ট করুন।
3. সেটিংস দিন:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Render নিজে থেকেই `PORT` এনভায়রনমেন্ট ভ্যারিয়েবল সেট করে দেয়, `server.js`-এ সেটা আগে থেকেই হ্যান্ডেল করা আছে — তাই আলাদা কনফিগ লাগবে না।
5. ডিপ্লয় শেষ হলে Render একটা `.onrender.com` লিংক দিবে, যেটা দিয়ে সাইটটা লাইভ দেখা যাবে। পরে চাইলে কাস্টম ডোমেইনও যোগ করা যাবে (Render Settings → Custom Domain)।

## গুরুত্বপূর্ণ নোট
- **এটা Facebook-এর অফিসিয়াল API না** — পেজের HTML স্ট্রাকচার থেকে ডেটা টানা হয়, তাই Facebook তাদের পেজ স্ট্রাকচার বদলালে এক্সট্র্যাকশন ভেঙে যেতে পারে। মাঝেমধ্যে regex আপডেট করা লাগতে পারে।
- **শুধু পাবলিক পোস্টের জন্য কাজ করবে** — প্রাইভেট বা ফ্রেন্ডস-অনলি পোস্টের মিডিয়া বের করা যাবে না।
- এই ধরনের টুল Facebook-এর Terms of Service-এর সাথে সাংঘর্ষিক হতে পারে — ব্যবহারকারীদের শুধু নিজেদের কন্টেন্ট বা কপিরাইট-মুক্ত কন্টেন্টের জন্য ব্যবহার করার পরামর্শ দেওয়া ভালো (PinSave-এর মতোই)।
- ভবিষ্যতে rate-limit বা IP ব্লক এড়াতে রোটেটিং প্রক্সি/ইউজার-এজেন্ট বিবেচনা করা যেতে পারে যদি ট্রাফিক বাড়ে।

## পরের ধাপ (ঐচ্ছিক)
- ফ্রন্টএন্ডে `hd`/`sd`/`photos` রেজাল্ট আসল ডাউনলোড বাটন হিসেবে দেখানো (এখন শুধু `console.log` হচ্ছে)
- ডাউনলোড কাউন্ট / analytics যোগ করা
- ডোমেইন ও হোস্টিং সেটআপ

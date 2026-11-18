/*
  এই ফাইলে শুধু দুটি লাইন বদলাতে হবে।
  Supabase → Project Settings → API থেকে "Project URL" আর "anon public"
  (anon key গোপন কিছু নয়, সাইটের কোডে থাকাই নিয়ম। কিন্তু "service_role" key কখনো এখানে বসাবেন না।)

  যতক্ষণ নিচের দুটি মান না বসাচ্ছেন, সাইট "ডেমো মোডে" নমুনা তথ্য দেখাবে।
*/
window.APP_CONFIG = {
  SUPABASE_URL: "https//arkdxcgjnjmqnegpcgsq.supabase.co",
  SUPABASE_ANON_KEY:"sb_publishable_uOCAn-fBGKfQZm4VSf9zxg_w2tMiqSV",

  // শেষ রক্তদানের পর কতদিন পর আবার "রক্ত দিতে প্রস্তুত" দেখাবে
  DONATION_GAP_DAYS: 120
};

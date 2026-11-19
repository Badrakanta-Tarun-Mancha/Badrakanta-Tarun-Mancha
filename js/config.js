/*
  Supabase সংযোগের তথ্য। (পাবলিশেবল কি গোপন কিছু নয়, সাইটের কোডে থাকাই নিয়ম।)
  কিন্তু "secret" বা "service_role" key কখনো এখানে বসাবেন না।
*/
window.APP_CONFIG = {
  SUPABASE_URL: "https://arkdxcgjnjmqnegpcgsq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_uOCAn-fBGKfQZm4VSf9zxg_w2tMiqSV",

  // শেষ রক্তদানের পর কতদিন পর আবার "রক্ত দিতে প্রস্তুত" দেখাবে
  DONATION_GAP_DAYS: 120
};

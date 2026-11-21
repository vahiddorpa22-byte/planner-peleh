/* LOCAL TEST ONLY (sms-fix) — never upload. Replaces supabase.js with an in-memory mock.
   Scenario from ?scn= : signed_out | google_new | google_skipped | phone_new | email_old */
(function(){
  var scn = new URLSearchParams(location.search).get("scn") || "signed_out";
  var UID = "11111111-1111-4111-8111-111111111111";
  function prof(name, phone, verified, data, email){ return {id:UID, name:name, phone:phone, phone_verified:verified, verified_phone: verified ? phone : null,
    birthdate:null, photo:null, referral_code:"MYCODE12", email:email, created_at:new Date().toISOString(), data:data||{}}; }
  var G = "test.user@example.com";
  var S = {
    signed_out:     {user:null, profile:null},
    google_new:     {user:{id:UID, email:G, app_metadata:{provider:"google"}}, profile:prof("", null, false, {}, G)},
    google_skipped: {user:{id:UID, email:G, app_metadata:{provider:"google"}}, profile:prof("Test", null, false, {phoneSkip:{abroad:true, at:"2026-10-26T00:00:00Z"}, seenCoach:{quickstart_v1:true, today:true}}, G)},
    phone_new:      {user:{id:UID, email:"09121234567@phone.pelehapp.ir", app_metadata:{provider:"email"}}, profile:prof("", "09121234567", true, {}, "09121234567@phone.pelehapp.ir")},
    email_old:      {user:{id:UID, email:"old.user@example.com", app_metadata:{provider:"email"}}, profile:prof("", null, false, {}, "old.user@example.com")}
  };
  var s = S[scn] || S.signed_out;
  window.__SCN = scn;
  window.__MOCK_INIT = {user:s.user, profile:s.profile,
    rpc:{peleh_client_flags:{plus_enabled:false, quickstart_v1:true, min_app_version:"0"}},
    invoke:{
      "send-otp": function(b){ return {success:true, message:"mock", expiresInSeconds:300}; },
      "verify-otp": function(b){ return {success:true, message:"mock"}; },
      "grant-welcome-premium": function(){ return {success:true, days:7}; },
      "apply-referral": function(){ return {success:false}; }
    }};
})();
/* Mock سبک supabase-js برای تست مرورگری (فقط تست — در production استفاده نمی‌شه).
   وضعیت از window.__MOCK_INIT (اگه قبل از این فایل تعریف شده باشه) خونده می‌شه:
     { user:{id,email}, profile:{...row}, rpc:{name: value | (args)=>value}, tables:{name:[rows]} }
   همه‌ی فراخوانی‌ها در window.__mock.calls ثبت می‌شن. */
(function(){
  const init = window.__MOCK_INIT || {};
  const M = window.__mock = {
    user: ("user" in init) ? init.user : { id: "11111111-1111-4111-8111-111111111111", email: "09120000000@phone.peleh" },
    profile: init.profile || null,
    rpc: init.rpc || {},
    tables: init.tables || {},
    invoke: init.invoke || {},
    calls: [],
  };
  const ok = (data, extra) => Promise.resolve(Object.assign({ data, error: null, count: Array.isArray(data) ? data.length : 0 }, extra || {}));
  function exec(st){
    M.calls.push({ table: st.table, op: st.op, payload: st.payload, filters: st.filters, select: st.selectArgs });
    if(st.table === "profiles" && M.profile){
      if(st.op === "select"){
        const sel = (st.selectArgs && st.selectArgs[0]) || "*";
        let row = M.profile;
        if(/rev:data->>_rev/.test(sel)) row = { rev: (M.profile.data || {})._rev || null };
        else if(sel === "data") row = { data: M.profile.data };
        return ok(st.single ? JSON.parse(JSON.stringify(row)) : [JSON.parse(JSON.stringify(row))]);
      }
      if(st.op === "update"){
        const p = JSON.parse(JSON.stringify(st.payload || {}));
        Object.assign(M.profile, p);
        return ok(st.selectArgs ? [{ id: M.profile.id }] : null);
      }
      if(st.op === "upsert" || st.op === "insert") return ok(null);
    }
    const rows = M.tables[st.table] || [];
    if(st.op === "select"){
      if(st.selectArgs && st.selectArgs[1] && st.selectArgs[1].head) return ok(null, { count: rows.length });
      return ok(st.single ? (rows[0] || null) : rows);
    }
    if(st.op === "insert" || st.op === "upsert"){
      const arr = Array.isArray(st.payload) ? st.payload : [st.payload];
      M.tables[st.table] = rows.concat(arr);
      return ok(st.selectArgs ? arr : null);
    }
    return ok(st.selectArgs ? [] : null);
  }
  function query(table){
    const st = { table, op: "select", filters: [], payload: null, single: false, selectArgs: null };
    const q = new Proxy(function(){}, {
      get(_t, prop){
        if(prop === "then"){ const p = exec(st); return p.then.bind(p); }
        if(prop === "catch" || prop === "finally"){ const p = exec(st); return p[prop].bind(p); }
        return (...args) => {
          if(prop === "select"){ st.selectArgs = args; }
          else if(["update", "insert", "upsert", "delete"].includes(prop)){ st.op = prop; st.payload = args[0]; }
          else if(prop === "maybeSingle" || prop === "single"){ st.single = true; }
          else st.filters.push([prop].concat(args));
          return q;
        };
      },
    });
    return q;
  }
  const channelObj = { on(){ return channelObj; }, subscribe(){ return channelObj; }, unsubscribe(){} };
  const client = {
    from: query,
    rpc(name, args){
      M.calls.push({ rpc: name, args });
      const v = M.rpc[name];
      if(v === undefined) return Promise.resolve({ data: null, error: { message: "mock: rpc " + name + " not defined", code: "PGRST202" } });
      try{ return ok(typeof v === "function" ? v(args) : v); }
      catch(e){ return Promise.resolve({ data: null, error: { message: e.message } }); }
    },
    functions: { invoke(name, opts){
      M.calls.push({ invoke: name, body: opts && opts.body });
      const v = M.invoke[name];
      return Promise.resolve({ data: v === undefined ? { success: false } : (typeof v === "function" ? v(opts && opts.body) : v), error: null });
    } },
    auth: {
      getSession(){ return Promise.resolve({ data: { session: M.user ? { user: M.user, access_token: "mock" } : null }, error: null }); },
      getUser(){ return Promise.resolve({ data: { user: M.user }, error: null }); },
      onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; },
      signOut(){ M.user = null; return Promise.resolve({ error: null }); },
      refreshSession(){ return Promise.resolve({ data: { session: { user: M.user } }, error: null }); },
    },
    storage: { from(bucket){ return {
      upload(path){ M.calls.push({ upload: bucket + "/" + path }); return ok({ path }); },
      createSignedUrl(path){ return ok({ signedUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }); },
      createSignedUrls(paths){ return ok((paths || []).map(p => ({ path: p, signedUrl: "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="80"><rect width="60" height="80" fill="#8a7"/></svg>') }))); },
      getPublicUrl(path){ return { data: { publicUrl: "/mock/" + bucket + "/" + path } }; },
      remove(){ return ok([]); },
    }; } },
    channel(){ return channelObj; },
    removeChannel(){ return Promise.resolve(); },
  };
  window.supabase = { createClient(){ return client; } };
})();

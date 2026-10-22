import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const UPLOAD_BUCKET = 'uploads';

// Entity name -> table name.
const TABLES = {
  Account: 'accounts',
  AllocationRule: 'allocation_rules',
  AuditLog: 'audit_logs',
  Company: 'companies',
  CompanyUser: 'company_users',
  Document: 'documents',
  TaxReturn: 'tax_returns',
  Transaction: 'transactions',
};

const fail = (error) => {
  const err = new Error(error.message || 'Request failed');
  err.status = error.status || (error.code === 'PGRST301' ? 401 : undefined);
  err.code = error.code;
  throw err;
};

// "-date" -> { column: "date", ascending: false }
const parseSort = (sort) => {
  if (!sort || typeof sort !== 'string') return null;
  return sort.startsWith('-')
    ? { column: sort.slice(1), ascending: false }
    : { column: sort, ascending: true };
};

// Supports both filter(query, "-date", 50) and filter(query, { sort, limit }).
const normalizeOptions = (sortOrOptions, limit) => {
  if (sortOrOptions && typeof sortOrOptions === 'object') {
    return { sort: sortOrOptions.sort, limit: sortOrOptions.limit ?? limit };
  }
  return { sort: sortOrOptions, limit };
};

// Applies { field: value } and { field: { $in: [...] } } style filters.
const applyQuery = (builder, query = {}) => {
  for (const [field, value] of Object.entries(query)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) builder = builder.in(field, value.$in);
      else if ('$ne' in value) builder = builder.neq(field, value.$ne);
      else if ('$gt' in value) builder = builder.gt(field, value.$gt);
      else if ('$gte' in value) builder = builder.gte(field, value.$gte);
      else if ('$lt' in value) builder = builder.lt(field, value.$lt);
      else if ('$lte' in value) builder = builder.lte(field, value.$lte);
    } else if (value === null) {
      builder = builder.is(field, null);
    } else {
      builder = builder.eq(field, value);
    }
  }
  return builder;
};

const makeEntity = (table) => {
  const select = async (query, sortOrOptions, limit) => {
    const opts = normalizeOptions(sortOrOptions, limit);
    let builder = applyQuery(supabase.from(table).select('*'), query);
    const sort = parseSort(opts.sort);
    if (sort) builder = builder.order(sort.column, { ascending: sort.ascending });
    if (opts.limit) builder = builder.limit(opts.limit);
    const { data, error } = await builder;
    if (error) fail(error);
    return data || [];
  };

  return {
    filter: select,
    list: (sort, limit) => select({}, sort, limit),
    async create(record) {
      const { data, error } = await supabase.from(table).insert(record).select().single();
      if (error) fail(error);
      return data;
    },
    async bulkCreate(records) {
      if (!records?.length) return [];
      const { data, error } = await supabase.from(table).insert(records).select();
      if (error) fail(error);
      return data || [];
    },
    async update(id, patch) {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
      if (error) fail(error);
      return data;
    },
    // records: [{ id, ...fields }]
    async bulkUpdate(records) {
      const results = await Promise.all(
        (records || []).map(({ id, ...patch }) =>
          supabase.from(table).update(patch).eq('id', id).select().single()
        )
      );
      const failed = results.find((r) => r.error);
      if (failed) fail(failed.error);
      return results.map((r) => r.data);
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) fail(error);
      return { id };
    },
    async count(query) {
      const { count, error } = await applyQuery(
        supabase.from(table).select('id', { count: 'exact', head: true }),
        query
      );
      if (error) fail(error);
      return count || 0;
    },
  };
};

const entities = Object.fromEntries(Object.entries(TABLES).map(([name, table]) => [name, makeEntity(table)]));

// ---------------------------------------------------------------- auth
const toAppUser = async (authUser) => {
  if (!authUser) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
    role: profile?.role || 'user',
  };
};

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = new Error(error?.message || 'Not authenticated');
      err.status = 401;
      throw err;
    }
    return toAppUser(data.user);
  },
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) fail(error);
    return data;
  },
  loginWithProvider(provider, redirectPath = '/') {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + redirectPath },
    });
  },
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) fail(error);
    return data;
  },
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) fail(error);
    return { access_token: data?.session?.access_token };
  },
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) fail(error);
  },
  // Session is persisted by supabase-js itself, so this is a no-op kept for call compatibility.
  setToken() {},
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) fail(error);
  },
  // Called from /reset-password after the recovery link signs the user in.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) fail(error);
  },
  async logout(redirectTo) {
    await supabase.auth.signOut();
    if (redirectTo) window.location.href = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/login';
  },
  redirectToLogin() {
    window.location.href = '/login';
  },
};

// ---------------------------------------------------------------- team invites
const users = {
  // The invite is recorded as a CompanyUser row (status "invited") keyed by email;
  // the invitee gets access when they sign up with that email (see is_company_member()).
  async inviteUser() {
    return { invited: true };
  },
};

// ---------------------------------------------------------------- storage + integrations
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const uploadPrivate = async (file, companyId, kind) => {
  if (!companyId) throw new Error('Select a company before uploading');
  const folder = kind ? kind.replace(/[^a-zA-Z0-9._-]/g, '_') : 'misc';
  const path = `${companyId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) fail(error);
  return path;
};

export const createSignedUrl = async (path, expiresIn = 600) => {
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).createSignedUrl(path, expiresIn);
  if (error) fail(error);
  return data.signedUrl;
};

export const deleteUpload = async (path) => {
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).remove([path]);
  if (error) fail(error);
};

const aiNotConfigured = () => {
  const err = new Error('AI is not configured yet. Add the Together AI key to enable this feature.');
  err.code = 'AI_NOT_CONFIGURED';
  throw err;
};

const integrations = {
  Core: {
    // `file_url` keeps its name for compatibility; it now holds the private storage path.
    async UploadFile({ file, companyId, kind }) {
      return { file_url: await uploadPrivate(file, companyId, kind) };
    },
    async UploadPrivateFile({ file, companyId, kind }) {
      return { file_uri: await uploadPrivate(file, companyId, kind) };
    },
    async CreateFileSignedUrl({ file_uri, expires_in = 600 }) {
      return { signed_url: await createSignedUrl(file_uri, expires_in) };
    },
    async DeleteFile({ file_uri }) {
      await deleteUpload(file_uri);
      return { deleted: true };
    },
    // Wired to the "ai" Edge Function once the Together AI key is set.
    InvokeLLM: aiNotConfigured,
    ExtractDataFromUploadedFile: aiNotConfigured,
  },
};

// ---------------------------------------------------------------- edge functions
const functions = {
  async invoke(name, body) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) fail(error);
    return { data };
  },
};

// Same surface the pages already use, backed by Supabase.
export const db = { entities, auth, users, integrations, functions };

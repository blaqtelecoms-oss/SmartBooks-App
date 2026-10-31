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
  BankRule: 'bank_rules',
  Company: 'companies',
  CompanyUser: 'company_users',
  Contact: 'contacts',
  Document: 'documents',
  InventoryItem: 'inventory_items',
  Invoice: 'invoices',
  PaymentGatewaySetting: 'payment_gateway_settings',
  Service: 'services',
  StockMovement: 'stock_movements',
  TaxReturn: 'tax_returns',
  Transaction: 'transactions',
  Warehouse: 'warehouses',
  WarehouseStock: 'warehouse_stock',
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
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || meta.full_name || meta.name || null,
    role: profile?.role || 'user',
    // Which portal the account belongs to ("business" | "accountant") and whether
    // its onboarding is done. Null/false for accounts created before portals existed.
    portal: profile?.portal || meta.portal || null,
    onboarding_completed: profile?.onboarding_completed === true,
    // True once the six-digit email code has been confirmed.
    email_verified: !!profile?.email_verified_at,
    avatar_url: meta.avatar_url || null,
    // Business details edited on the profile page live in the user's metadata.
    business_name: meta.business_name || null,
    phone: meta.phone || null,
    vat_number: meta.vat_number || null,
    registration_number: meta.registration_number || null,
    address: meta.address || null,
    // Accountant profile: personal details plus an optional practice.
    country: meta.country || null,
    currency: meta.currency || null,
    practice_name: meta.practice_name || null,
    practice_email: meta.practice_email || null,
    practice_phone: meta.practice_phone || null,
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
  // Account creation without email verification: the portal chosen up front is
  // recorded on the account so onboarding and every later sign-in know it.
  async register({ email, password, fullName, portal }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName?.trim() || null, portal: portal || null },
      },
    });
    if (error) fail(error);
    if (data?.session && data?.user) {
      // handle_new_user() already created the profile row; mirror the portal there.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName?.trim() || null, portal: portal || null })
        .eq('id', data.user.id);
      if (profileError) fail(profileError);
    }
    return data;
  },
  // Marks the account's portal onboarding as finished. `metadataPatch` keeps the
  // details the wizard collected on the auth user, as the profile page already does.
  async completeOnboarding({ portal, profilePatch = {}, metadataPatch = {} }) {
    if (Object.keys(metadataPatch).length > 0) {
      const { error: metadataError } = await supabase.auth.updateUser({ data: metadataPatch });
      if (metadataError) fail(metadataError);
    }
    const { data: current, error: userError } = await supabase.auth.getUser();
    if (userError || !current?.user) fail(userError || { message: 'Not authenticated', status: 401 });
    const { error } = await supabase
      .from('profiles')
      .update({ ...profilePatch, portal, onboarding_completed: true })
      .eq('id', current.user.id);
    if (error) fail(error);
    return toAppUser({
      ...current.user,
      user_metadata: { ...(current.user.user_metadata || {}), ...metadataPatch },
    });
  },
  // Session is persisted by supabase-js itself, so this is a no-op kept for call compatibility.
  setToken() {},
  // A six-digit code is emailed through Resend (supabase/functions/send-verification-code).
  async sendVerificationCode() {
    return functions.invoke('send-verification-code', {});
  },
  async verifyEmailCode(code) {
    return functions.invoke('verify-email-code', { code });
  },
  // Emails a single-use reset link through Resend; always reports success so the
  // page never reveals whether an account exists.
  async resetPasswordRequest(email) {
    return functions.invoke('request-password-reset', {
      email,
      app_url: window.location.origin,
    });
  },
  // Called from /reset-password with the token from the emailed link.
  async resetPassword({ newPassword, token }) {
    return functions.invoke('reset-password', { token, new_password: newPassword });
  },
  // Profile picture lives in the auth user's metadata, so no schema change is needed.
  async updateAvatar(avatarUrl) {
    const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (error) fail(error);
    return data?.user?.user_metadata?.avatar_url || null;
  },
  // Editable profile + business details (no schema change: stored on the auth user).
  async updateProfile(patch) {
    const { data: current, error: userError } = await supabase.auth.getUser();
    if (userError || !current?.user) fail(userError || { message: 'Not authenticated', status: 401 });
    const { error } = await supabase.auth.updateUser({ data: patch });
    if (error) fail(error);
    if (patch.full_name) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: patch.full_name })
        .eq('id', current.user.id);
      if (profileError) fail(profileError);
    }
    return toAppUser({ ...current.user, user_metadata: { ...(current.user.user_metadata || {}), ...patch } });
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
    if (error) {
      // Edge Functions return a JSON { error } body; surface it instead of the generic non-2xx message.
      let message = error.message;
      try {
        const detail = await error.context?.clone?.().json();
        if (detail?.error) message = detail.error;
      } catch {
        // Keep the generic message when the body is not JSON.
      }
      const err = new Error(message);
      err.status = error.context?.status;
      throw err;
    }
    return { data };
  },
};

// Same surface the pages already use, backed by Supabase.
export const db = { entities, auth, users, integrations, functions };

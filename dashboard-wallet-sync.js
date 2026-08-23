(() => {
  function money(value) {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function makeClient() {
    const cfg = window.SMH_CONFIG || {};
    if (!cfg.supabaseUrl || !(cfg.supabaseAnonKey || cfg.supabaseKey) || !window.supabase) return null;
    return window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey || cfg.supabaseKey,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );
  }

  async function refreshWallet() {
    try {
      const sb = makeClient();
      if (!sb) return;
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await sb
        .from('wallets')
        .select('balance,currency,updated_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      const value = money(data?.balance || 0);

      ['walletStatBalance', 'walletBalance'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });
    } catch (err) {
      console.error('Dashboard wallet sync error:', err);
    }
  }

  window.refreshDashboardWallet = refreshWallet;

  const start = () => {
    refreshWallet();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshWallet();
    });
    window.addEventListener('pageshow', refreshWallet);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

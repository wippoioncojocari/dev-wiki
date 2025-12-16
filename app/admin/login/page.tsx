import Link from "next/link";
import { sanitizeNextPath } from "@/app/lib/admin-auth";

type SearchParams = {
  error?: string | string[];
  next?: string | string[];
};

const errorMessages: Record<string, string> = {
  invalid: "Parola nu este corecta.",
  rate: "Prea multe incercari. Incearca din nou in cateva minute.",
  setup: "Configureaza ADMIN_PASSWORD si ADMIN_COOKIE_SECRET in mediul de rulare.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const errorKey = Array.isArray(resolvedParams?.error)
    ? resolvedParams?.error[0]
    : resolvedParams?.error;
  const nextParam = Array.isArray(resolvedParams?.next) ? resolvedParams?.next[0] : resolvedParams?.next;
  const nextPath = sanitizeNextPath(nextParam);
  const message = errorKey ? errorMessages[errorKey] ?? "Nu s-a putut valida cererea." : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Panou administrare
            </p>
            <h1 className="text-2xl font-semibold text-white">Autentificare</h1>
            <p className="text-sm text-slate-300">
              Accesul este restrans. Parola este partajata doar in echipa de dezvoltare.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Inapoi la wiki
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm backdrop-blur">
          <form className="space-y-4" action="/api/admin-login" method="POST">
            <input type="hidden" name="next" value={nextPath} />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent, #34d399)]">
                Login admin
              </p>
              <p className="text-sm text-slate-400">
                Introdu parola interna pentru a intra in panoul de administrare. Cookie-ul de sesiune expira automat.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Parola
              <input
                required
                name="password"
                type="password"
                autoComplete="current-password"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[color:var(--accent, #34d399)]"
                placeholder="Parola partajata"
              />
            </label>

            {message ? <p className="text-sm text-rose-300">{message}</p> : null}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--accent, #34d399)] bg-[color:var(--accent-soft, rgba(52,211,153,0.15))] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent, #34d399)]"
            >
              Intra in admin
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Recomandari</p>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>Distribuie parola doar colegilor care editeaza continutul.</li>
              <li>Sterge cookie-ul de sesiune cu butonul de delogare dupa lucru pe statii partajate.</li>
              <li>Actualizeaza rapid parola daca este divulgata.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

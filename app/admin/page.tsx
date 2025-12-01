import Link from "next/link";
import { loadWikiData } from "../lib/wiki-source";
import { CreateSectionForm } from "../components/create-section-form";
import { DeleteSectionForm } from "../components/delete-section-form";

export default async function AdminPage() {
  const data = await loadWikiData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Panou administrare
            </p>
            <h1 className="text-2xl font-semibold text-white">Adauga sectiuni in wiki</h1>
            <p className="text-sm text-slate-300">
              Creeaza noduri noi si leaga-le la parinti existenti. Continutul initial este optional.
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

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-0">
        <CreateSectionForm sections={data.sections} />
        <DeleteSectionForm sections={data.sections} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">Reguli rapide</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-400">
            <li>ID-ul trebuie sa fie unic si devine slug in URL.</li>
            <li>Nu poti seta parinte care deja are continut; sterge continutul sau muta-l in copil.</li>
            <li>Dupa creare, poti edita/sterge prin API sau Prisma Studio.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

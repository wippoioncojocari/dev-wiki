## Cum sa completezi `app/wiki-data.json`

JSON-ul alimenteaza toate paginile si navigatia. Respecta structura de mai jos pentru fiecare sectiune:

```jsonc
{
  "title": "Titlul wiki-ului",
  "tagline": "Scurta descriere",
  "sections": [
    {
      "id": "front-end",           // slug folosit in URL, unic
      "title": "Front end",         // titlu afisat
      "summary": "Rezumat scurt",   // optional
      "addedAt": "2025-01-05",      // optional, ISO date yyyy-mm-dd
      "updatedAt": "2025-02-12",    // optional, ISO date
      "content": [                  // optional, afiseaza continutul articolului
        { "type": "paragraph", "text": "text simplu" },
        { "type": "list", "title": "Subtitlu", "items": ["punct 1", "punct 2"] },
        { "type": "code", "title": "Exemplu", "language": "ts", "value": "console.log('hi')" },
        { "type": "image", "alt": "descriere", "src": "https://...", "caption": "optional" },
        { "type": "video", "title": "Titlu video", "youtubeId": "abcd1234" }
      ],
      "children": [ ...sub-sectiuni... ] // optional
    }
  ]
}
```

### Reguli cheie
- `id` trebuie sa fie unic la fiecare nivel; acest lucru defineste ruta (`/id/copil`).
- Doar sectiunile fara `children` devin pagini (leaf). Parintii servesc ca noduri de meniu.
- Datele `addedAt` si `updatedAt` trebuie sa fie in format ISO `yyyy-mm-dd` pentru afisare corecta.
- `content` poate lipsi; daca lipseste, pagina afiseaza un mesaj ca nu exista continut.

### Tipuri de blocuri suportate
- `paragraph`: `{ "type": "paragraph", "text": "..." }`
- `list`: `{ "type": "list", "title": "Optional", "items": ["item1", "item2"] }`
- `code`: `{ "type": "code", "title": "Optional", "language": "ts", "value": "cod" }`
- `image`: `{ "type": "image", "alt": "desc", "src": "https://...", "caption": "Optional" }`
- `video`: `{ "type": "video", "title": "Optional", "youtubeId": "VIDEO_ID" }`

### Adaugare rapida
1) Creeaza un obiect nou in `sections` sau in `children` cu `id`, `title`, optional `summary`, `addedAt`, `updatedAt`.
2) Adauga `content` cu blocurile dorite.
3) Pentru sub-sectiuni, foloseste `children` si ai grija ca numai frunzele (fara copii) sa contina articolul principal.

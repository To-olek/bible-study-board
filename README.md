# Bible Study Board

Local visual Bible study board.

Open `index.html` in a browser, or run a local server from this folder.

Login:

- Login: `Login`
- Password: `Login`

Included:

- English minimal interface.
- Infinite pan and zoom board.
- Bottom toolbar with Hand, Select, Block, Text, Folder, Image, and Bible.
- Folder blocks live on the board and open into their own infinite boards.
- Drag the small dot on any block to connect it to another block.
- Shift-click and drag-select for multi-selection.
- Editable blocks directly on the board, plus a small inspector.
- Full local Bible packs in 10+ languages from public-domain/open eBible sources.
- Drag any verse from the Bible panel onto the board.
- Click a verse block to reopen that exact book, chapter, and verse.
- Local saving in `localStorage`, plus JSON import/export.

Bible data can be rebuilt with:

```sh
node tools/build-bibles.mjs
```

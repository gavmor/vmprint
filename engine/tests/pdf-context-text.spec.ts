import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PdfContext } from '../../contexts/pdf/src';

// Observe PDFKit's actual fragment calls, after its line wrapper has run.
type PdfInternals = {
    _fragment(text: string, x: number, y: number, options: Record<string, unknown>): void;
    link(x: number, y: number, width: number, height: number, target: string): unknown;
};

async function run(): Promise<void> {
    const context = new PdfContext({ autoFirstPage: true });
    const font = await readFile(new URL('../../font-managers/local/assets/fonts/NotoSans/NotoSans-Regular.ttf', import.meta.url));
    await context.registerFont('fixture', font);
    context.font('fixture', 12);
    // PDFKit's private fragment boundary is the point at which a wrapped line is actually emitted.
    const contextWithDocument = context as unknown as { doc: PdfInternals };
    const doc = contextWithDocument.doc;
    const fragments: Array<{ text: string; options: Record<string, unknown> }> = [];
    const links: Array<{ width: number; height: number; target: string }> = [];
    const fragment = doc._fragment.bind(doc);
    const link = doc.link.bind(doc);
    doc._fragment = (text, x, y, options) => {
        fragments.push({ text, options });
        fragment(text, x, y, options);
    };
    doc.link = (x, y, width, height, target) => {
        links.push({ width, height, target });
        return link(x, y, width, height, target);
    };

    const line = 'Oratory: The Set-Piece Speech  20';
    context.text(line, 20, 20, {
        lineBreak: false, width: 40, height: 14, ascent: 970,
        characterSpacing: 0.25, link: 'https://example.com'
    });
    assert.deepEqual(fragments.map((entry) => entry.text), [line]);
    assert.equal(fragments[0].options.characterSpacing, 0.25);
    assert.equal(fragments[0].options.baseline, -11.64);
    assert.deepEqual(links, [{ width: 40, height: 14, target: 'https://example.com' }]);

    fragments.length = 0;
    context.text('one two three four five six', 20, 60, {
        lineBreak: true, width: 40, height: 100, ascent: 970
    });
    assert.ok(fragments.length > 1, 'explicitly wrapped text must still wrap');
    context.end();
}

run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});

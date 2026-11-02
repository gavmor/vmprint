import assert from 'node:assert/strict';
import { VMPrintEngine, loadDocument } from '../src/index';
import LocalFontManager from '../../font-managers/local/src/index';

async function run(): Promise<void> {
    const doc = {
        documentVersion: '1.1',
        layout: {
            pageSize: { width: 300, height: 200 },
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            fontFamily: 'Arimo',
            fontSize: 12,
            lineHeight: 1.4
        },
        styles: {},
        elements: [
            {
                type: 'p',
                content: '',
                children: [
                    {
                        type: 'text',
                        content: 'Citizen, Grounded',
                        properties: {
                            sourceId: 'sc-test',
                            style: {
                                fontVariant: 'small-caps',
                                fontSize: 12,
                                fontWeight: 'bold'
                            }
                        }
                    }
                ]
            }
        ]
    };

    const engine = new VMPrintEngine(loadDocument(doc, 'small-caps-test'), new LocalFontManager());
    const pages = await engine.layout();
    const box = pages[0]?.boxes.find((b: any) => b.meta?.sourceId === 'author:sc-test' || b.lines?.length);
    assert.ok(box, 'paragraph box was rendered');
    const line = box!.lines![0]!;

    // Verify small caps expansion into uppercase runs and scaled lowercase runs
    const texts = line.map((seg: any) => seg.text);
    assert.deepEqual(texts, ['C', 'ITIZEN', ', G', 'ROUNDED']);

    // Check font sizes: full capitals at 12, small capitals at 9 (0.75 * 12)
    const sizes = line.map((seg: any) => seg.style?.fontSize ?? 12);
    assert.deepEqual(sizes, [12, 9, 12, 9]);
    console.log('PASS: small-caps synthetic expansion and font sizes verified');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

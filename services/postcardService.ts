
interface PostcardOptions {
    finalImageSrc: string;
    summary: string;
    items: string[];
    location: string;
}

/**
 * A helper function to wrap text on a canvas.
 * @param context The canvas rendering context.
 * @param text The text to wrap.
 * @param x The starting x position.
 * @param y The starting y position.
 * @param maxWidth The maximum width of a line.
 * @param lineHeight The height of each line.
 * @returns The y position after the last line of text.
 */
function wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, currentY);
    return currentY + lineHeight;
}

export const generatePostcard = (options: PostcardOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
        const { finalImageSrc, summary, items, location } = options;

        const canvas = document.createElement('canvas');
        const PADDING = 60;
        const IMAGE_SIZE = 1024;
        const TEXT_AREA_HEIGHT = 716;
        
        canvas.width = IMAGE_SIZE + PADDING * 2;
        canvas.height = IMAGE_SIZE + TEXT_AREA_HEIGHT + PADDING * 2;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        // 1. Draw background
        ctx.fillStyle = '#f5f1e8'; // brand-bg
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Load and draw the final image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Draw a subtle border/shadow for the image
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 10;
            
            ctx.drawImage(img, PADDING, PADDING, IMAGE_SIZE, IMAGE_SIZE);
            
            // Reset shadow for text
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 3. Draw text content
            const textX = PADDING;
            const textY = PADDING + IMAGE_SIZE + 80;
            const textAreaWidth = canvas.width - (PADDING * 2);

            // Title
            ctx.fillStyle = '#3a3a3a'; // brand-text
            ctx.font = 'bold 64px Kalam, cursive';
            ctx.textAlign = 'center';
            ctx.fillText(`Greetings from ${location}!`, canvas.width / 2, textY);
            
            // Journal Entry
            ctx.textAlign = 'left';
            ctx.font = '32px Kalam, cursive';
            const journalY = textY + 80;
            const summaryFinalY = wrapText(ctx, `"${summary}"`, textX, journalY, textAreaWidth, 40);

            // Item List
            const listY = summaryFinalY + 40;
            ctx.font = '32px Kalam, cursive';
            let currentListY = listY;
            items.forEach((item, index) => {
                const text = `${index + 1}. ${item}`;
                ctx.fillText(text, textX, currentListY);
                currentListY += 40;
            });
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            reject(err);
        };
        img.src = finalImageSrc;
    });
};

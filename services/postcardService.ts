
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


/**
 * A helper function to fit text into a max width by reducing font size.
 */
function fitTextOnCanvas(
    context: CanvasRenderingContext2D,
    text: string,
    fontFace: string,
    maxWidth: number,
    initialSize: number,
    x: number,
    y: number
) {
    let fontSize = initialSize;
    context.textAlign = 'left';
    do {
        // We use 'bold' as the title was bold before.
        context.font = `bold ${fontSize}px ${fontFace}`;
        if (context.measureText(text).width <= maxWidth) {
            break;
        }
        fontSize -= 2; // Decrement font size
    } while (fontSize > 18); // Don't let the font get too small

    context.fillText(text, x, y);
}


export const generatePostcard = (options: PostcardOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
        // The items are no longer displayed, but we destructure to avoid unused variable errors.
        const { finalImageSrc, summary, location } = options;

        const canvas = document.createElement('canvas');
        const PADDING = 80;
        const POSTCARD_WIDTH = 1800;
        const POSTCARD_HEIGHT = 1200;
        
        canvas.width = POSTCARD_WIDTH;
        canvas.height = POSTCARD_HEIGHT;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        // 1. Draw postcard background
        ctx.fillStyle = '#f5f1e8'; // brand-bg
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Load and draw the final image on the left side
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const IMAGE_AREA_WIDTH = POSTCARD_WIDTH / 2 - PADDING - (PADDING / 4);
            const IMAGE_AREA_HEIGHT = POSTCARD_HEIGHT - (PADDING * 2);

            // Draw a subtle border/shadow for the image
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 10;
            
            ctx.drawImage(img, PADDING, PADDING, IMAGE_AREA_WIDTH, IMAGE_AREA_HEIGHT);
            
            // Reset shadow for text
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 3. Draw a vertical dividing line
            const dividerX = PADDING + IMAGE_AREA_WIDTH + (PADDING / 2);
            ctx.strokeStyle = '#d1ccc1'; // A light gray
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(dividerX, PADDING);
            ctx.lineTo(dividerX, POSTCARD_HEIGHT - PADDING);
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash


            // 4. Draw text content on the right side
            const textX = dividerX + (PADDING / 2);
            const textY = PADDING + 100; // Start title lower
            const textAreaWidth = POSTCARD_WIDTH - textX - PADDING;

            // Title - using the new fitText helper
            ctx.fillStyle = '#3a3a3a'; // brand-text
            fitTextOnCanvas(ctx, `Greetings from ${location}!`, 'Kalam, cursive', textAreaWidth, 90, textX, textY);
            
            // Journal Entry
            ctx.font = '36px Kalam, cursive';
            const journalY = textY + 160;
            wrapText(ctx, `"${summary}"`, textX, journalY, textAreaWidth, 48);

            // 5. The item list is no longer rendered.
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            reject(err);
        };
        img.src = finalImageSrc;
    });
};

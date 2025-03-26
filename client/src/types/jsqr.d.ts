declare module 'jsqr' {
    interface Point {
        x: number;
        y: number;
    }

    interface QRCode {
        binaryData: number[];
        data: string;
        location: {
            topRightCorner: Point;
            topLeftCorner: Point;
            bottomRightCorner: Point;
            bottomLeftCorner: Point;
            topRightFinderPattern: Point;
            topLeftFinderPattern: Point;
            bottomLeftFinderPattern: Point;
            bottomRightAlignmentPattern?: Point;
        };
    }

    function jsQR(
        imageData: Uint8ClampedArray,
        width: number,
        height: number,
        includeMargin?: boolean
    ): QRCode | null;

    export = jsQR;
}
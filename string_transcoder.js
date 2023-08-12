class StringTranscoder {
    constructor(string, encoding) {
        this.source = string;
        this.buffer = Buffer.from(string, encoding ?? "uft8");
    }

    to(encoding) {
        return this.buffer.toString(encoding);
    }
}

String.prototype.transcodeFrom = function(encoding) {
    return new StringTranscoder(this, encoding)
}
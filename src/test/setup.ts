import '@testing-library/jest-dom';

declare global {
  interface String {
    toMillis(): number;
    toDate(): Date;
  }
  interface Date {
    toMillis(): number;
    toDate(): Date;
  }
}

if (!String.prototype.toMillis) {
  String.prototype.toMillis = function() {
    return new Date(this.toString()).getTime();
  };
}

if (!String.prototype.toDate) {
  String.prototype.toDate = function() {
    return new Date(this.toString());
  };
}

if (!Date.prototype.toMillis) {
  Date.prototype.toMillis = function() {
    return this.getTime();
  };
}

if (!Date.prototype.toDate) {
  Date.prototype.toDate = function() {
    return this;
  };
}


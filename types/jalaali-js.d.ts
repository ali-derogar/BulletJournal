declare module 'jalaali-js' {
  export interface JalaaliDate {
    jy: number;
    jm: number;
    jd: number;
  }

  export function toJalaali(gy: number, gm: number, gd: number): JalaaliDate;
  export function jalaaliToDateObject(jy: number, jm: number, jd: number): Date;
  export function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean;
  export function jalaaliMonthLength(jy: number, jm: number): number;
}
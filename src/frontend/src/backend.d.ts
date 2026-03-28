import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BusinessProfile {
    offerType: OfferType;
    seasonalActivity: SeasonalActivity;
    numberOfSeats: bigint;
    location: string;
}
export interface UserProfile {
    name: string;
    restaurantName: string;
}
export enum OfferType {
    bar = "bar",
    brzaHrana = "brzaHrana",
    kafic = "kafic",
    ostalo = "ostalo",
    restoran = "restoran"
}
export enum SeasonalActivity {
    oboje = "oboje",
    zima = "zima",
    ljeto = "ljeto"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    authorizeReadOnlyAccess(principal: Principal): Promise<void>;
    getAllBusinessProfilesReadOnly(): Promise<Array<[Principal, BusinessProfile]>>;
    getBusinessProfile(user: Principal): Promise<BusinessProfile | null>;
    getCallerBusinessProfile(): Promise<BusinessProfile | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasCallerReadOnlyAccess(): Promise<boolean>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    revokeReadOnlyAccess(principal: Principal): Promise<void>;
    saveBusinessProfile(profile: BusinessProfile): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import type { IGoogleConnectionRepository } from './types.ts';
import type { GoogleConnection, BusinessLocation } from '../../shared/types/domain.ts';
import { encryptToken, tryDecryptToken } from '../lib/tokenCrypto.ts';

export class GoogleConnectionRepository implements IGoogleConnectionRepository {
  async getByLocationId(tenantId: string, locationId: string): Promise<GoogleConnection | null> {
    const rows = await db
      .select()
      .from(schema.googleConnections)
      .where(
        and(
          eq(schema.googleConnections.tenantId, tenantId),
          eq(schema.googleConnections.businessLocationId, locationId)
        )
      );

    if (rows.length === 0) return null;
    const c = rows[0];
    return {
      id: c.id,
      saasCustomerId: c.tenantId,
      businessLocationId: c.businessLocationId,
      googleAccountId: c.googleAccountId,
      googleLocationName: c.googleLocationName,
      accessTokenEncrypted: c.accessTokenEncrypted || undefined,
      refreshTokenEncrypted: c.refreshTokenEncrypted || undefined,
      tokenExpiry: c.tokenExpiry ? c.tokenExpiry.toISOString() : new Date().toISOString(),
      scopes: c.scopes || [],
      status: c.status as any,
      lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    } as any;
  }

  async upsert(tenantId: string, connection: GoogleConnection): Promise<GoogleConnection> {
    const looksPlain = (v?: string | null) =>
      !!v && (v.startsWith('ya29.') || v.startsWith('1//') || v.startsWith('mock_') || v.length < 40);

    const rawAccess = (connection as any).accessToken || (connection as any).accessTokenEncrypted || null;
    const rawRefresh = (connection as any).refreshToken || (connection as any).refreshTokenEncrypted || null;
    const accessEnc = rawAccess ? (looksPlain(rawAccess) ? encryptToken(rawAccess) : rawAccess) : null;
    const refreshEnc = rawRefresh ? (looksPlain(rawRefresh) ? encryptToken(rawRefresh) : rawRefresh) : null;

    const [upserted] = await db
      .insert(schema.googleConnections)
      .values({
        id: connection.id,
        tenantId,
        businessLocationId: connection.businessLocationId,
        googleAccountId: connection.googleAccountId,
        googleLocationName: connection.googleLocationName,
        accessTokenEncrypted: accessEnc,
        refreshTokenEncrypted: refreshEnc,
        tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry) : undefined,
        scopes: connection.scopes,
        status: connection.status,
        lastSyncedAt: connection.lastSyncedAt ? new Date(connection.lastSyncedAt) : undefined,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.googleConnections.businessLocationId,
        set: {
          googleAccountId: connection.googleAccountId,
          googleLocationName: connection.googleLocationName,
          accessTokenEncrypted: accessEnc,
          refreshTokenEncrypted: refreshEnc,
          tokenExpiry: connection.tokenExpiry ? new Date(connection.tokenExpiry) : undefined,
          scopes: connection.scopes,
          status: connection.status,
          lastSyncedAt: connection.lastSyncedAt ? new Date(connection.lastSyncedAt) : undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: upserted.id,
      saasCustomerId: upserted.tenantId,
      businessLocationId: upserted.businessLocationId,
      googleAccountId: upserted.googleAccountId,
      googleLocationName: upserted.googleLocationName,
      accessTokenEncrypted: upserted.accessTokenEncrypted || undefined,
      refreshTokenEncrypted: upserted.refreshTokenEncrypted || undefined,
      tokenExpiry: upserted.tokenExpiry ? upserted.tokenExpiry.toISOString() : new Date().toISOString(),
      scopes: upserted.scopes,
      status: upserted.status as any,
      lastSyncedAt: upserted.lastSyncedAt ? upserted.lastSyncedAt.toISOString() : undefined,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    } as any;
  }

  async updateTokens(
    tenantId: string,
    connectionId: string,
    accessToken: string,
    refreshToken?: string,
    expiry?: string
  ): Promise<void> {
    // Encrypt tokens at rest (AES-256-GCM). Never store plaintext OAuth tokens.
    const setValues: Record<string, any> = {
      accessTokenEncrypted: encryptToken(accessToken),
      tokenExpiry: expiry ? new Date(expiry) : new Date(Date.now() + 3600000),
      status: 'CONNECTED',
      updatedAt: new Date(),
    };
    if (refreshToken) setValues.refreshTokenEncrypted = encryptToken(refreshToken);

    await db
      .update(schema.googleConnections)
      .set(setValues)
      .where(and(eq(schema.googleConnections.tenantId, tenantId), eq(schema.googleConnections.id, connectionId)));
  }

  /**
   * Returns decrypted OAuth tokens for Google API calls.
   */
  async getDecryptedTokens(
    tenantId: string,
    locationId: string
  ): Promise<{ accessToken: string; refreshToken: string | null; tokenExpiry: string | null } | null> {
    const connection = await this.getByLocationId(tenantId, locationId);
    if (!connection) return null;

    const accessToken = tryDecryptToken((connection as any).accessTokenEncrypted);
    if (!accessToken) return null;

    const refreshToken = tryDecryptToken((connection as any).refreshTokenEncrypted);

    return {
      accessToken,
      refreshToken,
      tokenExpiry: connection.tokenExpiry || null,
    };
  }

  async disconnect(tenantId: string, connectionId: string): Promise<void> {
    await db
      .update(schema.googleConnections)
      .set({ status: 'DISCONNECTED', updatedAt: new Date() })
      .where(and(eq(schema.googleConnections.tenantId, tenantId), eq(schema.googleConnections.id, connectionId)));
  }

  async getLocation(tenantId: string, locationId: string): Promise<BusinessLocation | null> {
    const rows = await db
      .select()
      .from(schema.businessLocations)
      .where(
        and(
          eq(schema.businessLocations.tenantId, tenantId),
          eq(schema.businessLocations.id, locationId)
        )
      );

    if (rows.length === 0) return null;
    return this.mapLocation(rows[0]);
  }

  async listLocations(tenantId: string): Promise<BusinessLocation[]> {
    const rows = await db
      .select()
      .from(schema.businessLocations)
      .where(eq(schema.businessLocations.tenantId, tenantId));

    return rows.map(this.mapLocation);
  }

  async upsertLocation(tenantId: string, location: BusinessLocation): Promise<BusinessLocation> {
    const [upserted] = await db
      .insert(schema.businessLocations)
      .values({
        id: location.id,
        tenantId,
        businessId: location.businessId,
        googleLocationId: location.googleLocationId,
        googlePlaceId: location.googlePlaceId,
        locationName: location.locationName,
        addressLines: location.address.addressLines,
        locality: location.address.locality,
        administrativeArea: location.address.administrativeArea,
        postalCode: location.address.postalCode,
        country: location.address.country,
        primaryPhone: location.primaryPhone,
        primaryCategory: location.primaryCategory,
        isConnected: location.isConnected,
        automationEnabled: location.automationEnabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.businessLocations.tenantId, schema.businessLocations.googleLocationId],
        set: {
          locationName: location.locationName,
          addressLines: location.address.addressLines,
          locality: location.address.locality,
          administrativeArea: location.address.administrativeArea,
          postalCode: location.address.postalCode,
          country: location.address.country,
          primaryPhone: location.primaryPhone,
          primaryCategory: location.primaryCategory,
          isConnected: location.isConnected,
          automationEnabled: location.automationEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.mapLocation(upserted);
  }

  private mapLocation(l: typeof schema.businessLocations.$inferSelect): BusinessLocation {
    return {
      id: l.id,
      saasCustomerId: l.tenantId,
      businessId: l.businessId,
      googleLocationId: l.googleLocationId,
      googlePlaceId: l.googlePlaceId || undefined,
      locationName: l.locationName,
      address: {
        addressLines: l.addressLines,
        locality: l.locality,
        administrativeArea: l.administrativeArea,
        postalCode: l.postalCode,
        country: l.country,
      },
      primaryPhone: l.primaryPhone || undefined,
      primaryCategory: l.primaryCategory || undefined,
      isConnected: l.isConnected,
      automationEnabled: l.automationEnabled,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }
}

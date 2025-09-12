import { performance } from 'perf_hooks';

// Mock Avatar Data Structure
interface AvatarData {
  id: string;
  userId: string;
  imageUrl: string;
  position: { x: number; y: number };
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: number;
  groupId?: string;
  metadata: {
    name: string;
    role?: string;
    isTyping?: boolean;
    unreadCount?: number;
  };
}

// Mock Connection Data
interface ConnectionData {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'direct' | 'group' | 'broadcast';
  strength: number; // 0-1, affects line thickness/opacity
  lastActivity: number;
  isActive: boolean;
}

// Large-Scale Avatar Manager
class LargeScaleAvatarManager {
  private avatars: Map<string, AvatarData> = new Map();
  private connections: Map<string, ConnectionData> = new Map();
  private visibleAvatars: Set<string> = new Set();
  private renderCache: Map<string, any> = new Map();
  private performanceMetrics: Array<{
    operation: string;
    duration: number;
    dataSize: number;
    timestamp: number;
  }> = [];

  // Batch Avatar Operations
  addAvatarsBatch(avatars: AvatarData[]): { duration: number; processed: number; errors: number } {
    const startTime = performance.now();
    let processed = 0;
    let errors = 0;

    try {
      avatars.forEach(avatar => {
        this.avatars.set(avatar.id, avatar);
        processed++;
      });
    } catch (error) {
      errors++;
    }

    const duration = performance.now() - startTime;
    
    this.performanceMetrics.push({
      operation: 'addAvatarsBatch',
      duration,
      dataSize: avatars.length,
      timestamp: startTime
    });

    return { duration, processed, errors };
  }

  // Efficient Viewport Culling
  updateVisibleAvatars(
    viewport: { x: number; y: number; width: number; height: number },
    buffer: number = 100
  ): { visible: number; culled: number; duration: number } {
    const startTime = performance.now();
    const newVisible = new Set<string>();
    let culled = 0;

    // Expand viewport with buffer for smooth scrolling
    const expandedViewport = {
      x: viewport.x - buffer,
      y: viewport.y - buffer,
      width: viewport.width + buffer * 2,
      height: viewport.height + buffer * 2
    };

    this.avatars.forEach((avatar, id) => {
      const isVisible = this.isAvatarInViewport(avatar, expandedViewport);
      
      if (isVisible) {
        newVisible.add(id);
      } else if (this.visibleAvatars.has(id)) {
        culled++;
      }
    });

    this.visibleAvatars = newVisible;
    const duration = performance.now() - startTime;

    this.performanceMetrics.push({
      operation: 'updateVisibleAvatars',
      duration,
      dataSize: this.avatars.size,
      timestamp: startTime
    });

    return { visible: newVisible.size, culled, duration };
  }

  // Spatial Indexing for Fast Queries
  createSpatialIndex(gridSize: number = 200): { 
    indexBuildTime: number; 
    gridCount: number;
    averageAvatarsPerGrid: number;
  } {
    const startTime = performance.now();
    const spatialIndex = new Map<string, string[]>();

    this.avatars.forEach((avatar, id) => {
      const gridX = Math.floor(avatar.position.x / gridSize);
      const gridY = Math.floor(avatar.position.y / gridSize);
      const gridKey = `${gridX},${gridY}`;

      if (!spatialIndex.has(gridKey)) {
        spatialIndex.set(gridKey, []);
      }
      spatialIndex.get(gridKey)!.push(id);
    });

    const indexBuildTime = performance.now() - startTime;
    const totalAvatars = Array.from(spatialIndex.values()).reduce((sum, avatars) => sum + avatars.length, 0);

    return {
      indexBuildTime,
      gridCount: spatialIndex.size,
      averageAvatarsPerGrid: totalAvatars / spatialIndex.size
    };
  }

  // Batch Status Updates
  updateStatusBatch(updates: Array<{ id: string; status: AvatarData['status']; timestamp?: number }>): {
    updated: number;
    failed: number;
    duration: number;
  } {
    const startTime = performance.now();
    let updated = 0;
    let failed = 0;

    updates.forEach(update => {
      const avatar = this.avatars.get(update.id);
      if (avatar) {
        avatar.status = update.status;
        avatar.lastSeen = update.timestamp || Date.now();
        updated++;
      } else {
        failed++;
      }
    });

    const duration = performance.now() - startTime;
    
    this.performanceMetrics.push({
      operation: 'updateStatusBatch',
      duration,
      dataSize: updates.length,
      timestamp: startTime
    });

    return { updated, failed, duration };
  }

  // Connection Management
  addConnectionsBatch(connections: ConnectionData[]): { 
    added: number; 
    duration: number; 
    memoryUsage?: number;
  } {
    const startTime = performance.now();
    const initialMemory = process.memoryUsage?.().heapUsed || 0;

    connections.forEach(connection => {
      this.connections.set(connection.id, connection);
    });

    const finalMemory = process.memoryUsage?.().heapUsed || 0;
    const duration = performance.now() - startTime;

    this.performanceMetrics.push({
      operation: 'addConnectionsBatch',
      duration,
      dataSize: connections.length,
      timestamp: startTime
    });

    return { 
      added: connections.length, 
      duration,
      memoryUsage: finalMemory - initialMemory
    };
  }

  // Search and Filter Operations
  searchAvatars(
    query: string, 
    filters?: { 
      status?: AvatarData['status'];
      groupId?: string;
      hasUnread?: boolean;
    }
  ): { results: AvatarData[]; searchTime: number; totalChecked: number } {
    const startTime = performance.now();
    const results: AvatarData[] = [];
    let totalChecked = 0;

    this.avatars.forEach(avatar => {
      totalChecked++;
      
      // Text search
      const matchesQuery = !query || 
        avatar.metadata.name.toLowerCase().includes(query.toLowerCase()) ||
        avatar.userId.toLowerCase().includes(query.toLowerCase());

      // Filter checks
      const matchesStatus = !filters?.status || avatar.status === filters.status;
      const matchesGroup = !filters?.groupId || avatar.groupId === filters.groupId;
      const matchesUnread = filters?.hasUnread === undefined || 
        (filters.hasUnread ? (avatar.metadata.unreadCount || 0) > 0 : (avatar.metadata.unreadCount || 0) === 0);

      if (matchesQuery && matchesStatus && matchesGroup && matchesUnread) {
        results.push(avatar);
      }
    });

    const searchTime = performance.now() - startTime;

    this.performanceMetrics.push({
      operation: 'searchAvatars',
      duration: searchTime,
      dataSize: this.avatars.size,
      timestamp: startTime
    });

    return { results, searchTime, totalChecked };
  }

  // Performance Analysis
  getPerformanceReport(): {
    totalOperations: number;
    averageOperationTime: number;
    slowestOperation: { operation: string; duration: number; dataSize: number };
    fastestOperation: { operation: string; duration: number; dataSize: number };
    operationBreakdown: Record<string, { count: number; averageTime: number; totalTime: number }>;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageOperationTime: 0,
        slowestOperation: { operation: 'none', duration: 0, dataSize: 0 },
        fastestOperation: { operation: 'none', duration: 0, dataSize: 0 },
        operationBreakdown: {}
      };
    }

    const sortedByDuration = [...this.performanceMetrics].sort((a, b) => b.duration - a.duration);
    const totalTime = this.performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0);

    const operationBreakdown = this.performanceMetrics.reduce((breakdown, metric) => {
      if (!breakdown[metric.operation]) {
        breakdown[metric.operation] = { count: 0, averageTime: 0, totalTime: 0 };
      }
      breakdown[metric.operation].count++;
      breakdown[metric.operation].totalTime += metric.duration;
      breakdown[metric.operation].averageTime = breakdown[metric.operation].totalTime / breakdown[metric.operation].count;
      return breakdown;
    }, {} as Record<string, { count: number; averageTime: number; totalTime: number }>);

    return {
      totalOperations: this.performanceMetrics.length,
      averageOperationTime: totalTime / this.performanceMetrics.length,
      slowestOperation: sortedByDuration[0],
      fastestOperation: sortedByDuration[sortedByDuration.length - 1],
      operationBreakdown
    };
  }

  // Utility Methods
  private isAvatarInViewport(avatar: AvatarData, viewport: { x: number; y: number; width: number; height: number }): boolean {
    return avatar.position.x >= viewport.x &&
           avatar.position.x <= viewport.x + viewport.width &&
           avatar.position.y >= viewport.y &&
           avatar.position.y <= viewport.y + viewport.height;
  }

  // Data Generation for Testing
  generateTestAvatars(count: number): AvatarData[] {
    const avatars: AvatarData[] = [];
    const statuses: AvatarData['status'][] = ['online', 'offline', 'away', 'busy'];
    const roles = ['member', 'admin', 'moderator', 'guest'];

    for (let i = 0; i < count; i++) {
      avatars.push({
        id: `avatar-${i}`,
        userId: `user-${i}`,
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        position: {
          x: Math.random() * 5000, // Large coordinate space
          y: Math.random() * 3000
        },
        status: statuses[Math.floor(Math.random() * statuses.length)],
        lastSeen: Date.now() - Math.random() * 3600000, // Within last hour
        groupId: Math.random() > 0.3 ? `group-${Math.floor(i / 20)}` : undefined,
        metadata: {
          name: `User ${i}`,
          role: roles[Math.floor(Math.random() * roles.length)],
          isTyping: Math.random() > 0.95,
          unreadCount: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0
        }
      });
    }

    return avatars;
  }

  generateTestConnections(avatarCount: number, connectionRatio: number = 0.1): ConnectionData[] {
    const connections: ConnectionData[] = [];
    const connectionCount = Math.floor(avatarCount * connectionRatio);

    for (let i = 0; i < connectionCount; i++) {
      const fromUser = Math.floor(Math.random() * avatarCount);
      const toUser = Math.floor(Math.random() * avatarCount);
      
      if (fromUser !== toUser) {
        connections.push({
          id: `connection-${i}`,
          fromUserId: `user-${fromUser}`,
          toUserId: `user-${toUser}`,
          type: Math.random() > 0.7 ? 'group' : 'direct',
          strength: Math.random(),
          lastActivity: Date.now() - Math.random() * 1800000, // Within last 30 minutes
          isActive: Math.random() > 0.2
        });
      }
    }

    return connections;
  }

  // Cleanup
  clear(): void {
    this.avatars.clear();
    this.connections.clear();
    this.visibleAvatars.clear();
    this.renderCache.clear();
    this.performanceMetrics = [];
  }

  // Getters
  get avatarCount(): number { return this.avatars.size; }
  get connectionCount(): number { return this.connections.size; }
  get visibleAvatarCount(): number { return this.visibleAvatars.size; }
}

describe('Large Data Performance Tests (10K+ Avatars)', () => {
  let avatarManager: LargeScaleAvatarManager;

  beforeEach(() => {
    avatarManager = new LargeScaleAvatarManager();
  });

  afterEach(() => {
    avatarManager.clear();
  });

  describe('Avatar Data Loading and Management', () => {
    it('should load 10,000 avatars efficiently', () => {
      const avatars = avatarManager.generateTestAvatars(10000);
      const loadResult = avatarManager.addAvatarsBatch(avatars);

      expect(loadResult.processed).toBe(10000);
      expect(loadResult.errors).toBe(0);
      expect(loadResult.duration).toBeLessThan(1000); // 1 second max
      expect(avatarManager.avatarCount).toBe(10000);
    });

    it('should handle progressive loading without performance degradation', () => {
      const batchSize = 1000;
      const totalBatches = 10;
      const loadTimes: number[] = [];

      for (let batch = 0; batch < totalBatches; batch++) {
        const avatars = avatarManager.generateTestAvatars(batchSize);
        const result = avatarManager.addAvatarsBatch(avatars);
        loadTimes.push(result.duration);
      }

      // Load times should remain consistent
      const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);
      const minLoadTime = Math.min(...loadTimes);

      expect(averageLoadTime).toBeLessThan(100); // 100ms per batch
      expect(maxLoadTime / minLoadTime).toBeLessThan(3); // No more than 3x variation
      expect(avatarManager.avatarCount).toBe(10000);
    });

    it('should manage memory efficiently with large datasets', () => {
      if (!process.memoryUsage) {
        return; // Skip if memory monitoring not available
      }

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Load 10K avatars
      const avatars = avatarManager.generateTestAvatars(10000);
      avatarManager.addAvatarsBatch(avatars);

      const afterLoadMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterLoadMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 10K avatars)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Test memory cleanup
      avatarManager.clear();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterCleanupMemory = process.memoryUsage().heapUsed;
      const memoryReclaimed = afterLoadMemory - afterCleanupMemory;

      // Should reclaim at least 80% of used memory
      expect(memoryReclaimed).toBeGreaterThan(memoryIncrease * 0.8);
    });
  });

  describe('Viewport Culling and Spatial Performance', () => {
    beforeEach(() => {
      // Setup 10K avatars for viewport tests
      const avatars = avatarManager.generateTestAvatars(10000);
      avatarManager.addAvatarsBatch(avatars);
    });

    it('should perform viewport culling efficiently', () => {
      const viewport = { x: 1000, y: 1000, width: 800, height: 600 };
      const cullResult = avatarManager.updateVisibleAvatars(viewport);

      expect(cullResult.duration).toBeLessThan(10); // 10ms max for culling
      expect(cullResult.visible).toBeLessThan(avatarManager.avatarCount); // Should cull some
      expect(cullResult.visible + cullResult.culled).toBeLessThanOrEqual(avatarManager.avatarCount);
    });

    it('should handle viewport movement smoothly', () => {
      const cullTimes: number[] = [];
      const startViewport = { x: 0, y: 0, width: 800, height: 600 };

      // Simulate smooth scrolling movement
      for (let i = 0; i < 100; i++) {
        const viewport = {
          x: startViewport.x + i * 10,
          y: startViewport.y + i * 5,
          width: 800,
          height: 600
        };

        const result = avatarManager.updateVisibleAvatars(viewport);
        cullTimes.push(result.duration);
      }

      const averageCullTime = cullTimes.reduce((sum, time) => sum + time, 0) / cullTimes.length;
      const slowCulls = cullTimes.filter(time => time > 5).length;

      expect(averageCullTime).toBeLessThan(3); // Average under 3ms
      expect(slowCulls).toBeLessThan(10); // Less than 10% slow culls
    });

    it('should optimize spatial indexing for large datasets', () => {
      const indexResult = avatarManager.createSpatialIndex(200);

      expect(indexResult.indexBuildTime).toBeLessThan(100); // 100ms to build index
      expect(indexResult.gridCount).toBeGreaterThan(0);
      expect(indexResult.averageAvatarsPerGrid).toBeLessThan(200); // Reasonable distribution
    });
  });

  describe('Connection Management at Scale', () => {
    beforeEach(() => {
      const avatars = avatarManager.generateTestAvatars(5000);
      avatarManager.addAvatarsBatch(avatars);
    });

    it('should handle large numbers of connections efficiently', () => {
      const connections = avatarManager.generateTestConnections(5000, 0.2); // 20% connection ratio
      const addResult = avatarManager.addConnectionsBatch(connections);

      expect(addResult.added).toBeGreaterThan(500);
      expect(addResult.duration).toBeLessThan(200); // 200ms max
      expect(avatarManager.connectionCount).toBe(addResult.added);
    });

    it('should manage memory growth with connections', () => {
      if (!process.memoryUsage) {
        return;
      }

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Add connections in batches
      for (let i = 0; i < 5; i++) {
        const connections = avatarManager.generateTestConnections(1000, 0.1);
        const result = avatarManager.addConnectionsBatch(connections);
        expect(result.memoryUsage).toBeDefined();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncrease = finalMemory - initialMemory;

      // Memory growth should be linear and reasonable
      expect(totalMemoryIncrease).toBeLessThan(30 * 1024 * 1024); // Less than 30MB
    });
  });

  describe('Search and Filter Performance', () => {
    beforeEach(() => {
      const avatars = avatarManager.generateTestAvatars(10000);
      avatarManager.addAvatarsBatch(avatars);
    });

    it('should perform text search efficiently on large datasets', () => {
      const searchQueries = ['User 1', 'User 99', 'User 555', 'User 9999'];
      const searchResults: Array<{ query: string; time: number; results: number }> = [];

      searchQueries.forEach(query => {
        const result = avatarManager.searchAvatars(query);
        searchResults.push({
          query,
          time: result.searchTime,
          results: result.results.length
        });
      });

      const averageSearchTime = searchResults.reduce((sum, r) => sum + r.time, 0) / searchResults.length;
      const slowSearches = searchResults.filter(r => r.time > 50).length;

      expect(averageSearchTime).toBeLessThan(20); // 20ms average
      expect(slowSearches).toBe(0); // No slow searches
    });

    it('should handle complex filtering efficiently', () => {
      const complexFilters = [
        { status: 'online' as const },
        { status: 'online' as const, hasUnread: true },
        { hasUnread: true },
        { groupId: 'group-1' },
        { status: 'offline' as const, groupId: 'group-2' }
      ];

      const filterResults: Array<{ filter: any; time: number; results: number }> = [];

      complexFilters.forEach(filter => {
        const result = avatarManager.searchAvatars('', filter);
        filterResults.push({
          filter,
          time: result.searchTime,
          results: result.results.length
        });
      });

      const averageFilterTime = filterResults.reduce((sum, r) => sum + r.time, 0) / filterResults.length;
      expect(averageFilterTime).toBeLessThan(30); // 30ms for complex filters
    });

    it('should maintain search performance under concurrent operations', async () => {
      // Simulate concurrent search requests
      const concurrentSearches = Array.from({ length: 20 }, (_, i) => 
        () => avatarManager.searchAvatars(`User ${i * 100}`)
      );

      const searchPromises = concurrentSearches.map(search => 
        new Promise(resolve => {
          const result = search();
          resolve(result);
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(searchPromises);
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(500); // All searches within 500ms
      expect(results).toHaveLength(20);
    });
  });

  describe('Real-time Updates at Scale', () => {
    beforeEach(() => {
      const avatars = avatarManager.generateTestAvatars(10000);
      avatarManager.addAvatarsBatch(avatars);
    });

    it('should handle batch status updates efficiently', () => {
      // Generate random status updates for 1000 users
      const updates = Array.from({ length: 1000 }, (_, i) => ({
        id: `avatar-${Math.floor(Math.random() * 10000)}`,
        status: ['online', 'offline', 'away', 'busy'][Math.floor(Math.random() * 4)] as AvatarData['status'],
        timestamp: Date.now()
      }));

      const updateResult = avatarManager.updateStatusBatch(updates);

      expect(updateResult.duration).toBeLessThan(50); // 50ms for 1000 updates
      expect(updateResult.updated + updateResult.failed).toBe(1000);
      expect(updateResult.updated).toBeGreaterThan(900); // Most should succeed
    });

    it('should handle rapid successive updates', () => {
      const updateBatches = 10;
      const updatesPerBatch = 500;
      const updateTimes: number[] = [];

      for (let batch = 0; batch < updateBatches; batch++) {
        const updates = Array.from({ length: updatesPerBatch }, (_, i) => ({
          id: `avatar-${(batch * updatesPerBatch + i) % 10000}`,
          status: 'online' as const,
          timestamp: Date.now()
        }));

        const result = avatarManager.updateStatusBatch(updates);
        updateTimes.push(result.duration);
      }

      const averageUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      const consistentUpdates = updateTimes.filter(time => time < 30).length;

      expect(averageUpdateTime).toBeLessThan(20);
      expect(consistentUpdates).toBeGreaterThan(8); // 80% should be fast
    });
  });

  describe('Overall System Performance Analysis', () => {
    it('should provide comprehensive performance analysis', () => {
      // Perform various operations to populate metrics
      const avatars = avatarManager.generateTestAvatars(5000);
      avatarManager.addAvatarsBatch(avatars);
      
      avatarManager.updateVisibleAvatars({ x: 0, y: 0, width: 800, height: 600 });
      avatarManager.searchAvatars('User 1');
      
      const updates = Array.from({ length: 100 }, (_, i) => ({
        id: `avatar-${i}`,
        status: 'online' as const
      }));
      avatarManager.updateStatusBatch(updates);

      const report = avatarManager.getPerformanceReport();

      expect(report.totalOperations).toBeGreaterThan(0);
      expect(report.averageOperationTime).toBeGreaterThan(0);
      expect(report.slowestOperation.operation).toBeDefined();
      expect(report.fastestOperation.operation).toBeDefined();
      expect(Object.keys(report.operationBreakdown)).toHaveLength(4); // 4 different operations
    });

    it('should identify performance bottlenecks correctly', () => {
      // Create scenario with intentionally different performance characteristics
      const smallBatch = avatarManager.generateTestAvatars(100);
      const largeBatch = avatarManager.generateTestAvatars(5000);

      avatarManager.addAvatarsBatch(smallBatch);
      avatarManager.addAvatarsBatch(largeBatch);

      const report = avatarManager.getPerformanceReport();

      expect(report.slowestOperation.dataSize).toBeGreaterThan(report.fastestOperation.dataSize);
      expect(report.slowestOperation.duration).toBeGreaterThan(report.fastestOperation.duration);
    });
  });

  describe('Stress Testing and Edge Cases', () => {
    it('should handle maximum theoretical load', () => {
      const maxAvatars = 50000; // Extreme stress test
      const avatars = avatarManager.generateTestAvatars(maxAvatars);
      
      const loadStart = performance.now();
      const result = avatarManager.addAvatarsBatch(avatars);
      const loadTime = performance.now() - loadStart;

      expect(result.processed).toBe(maxAvatars);
      expect(loadTime).toBeLessThan(10000); // 10 seconds max for extreme load
    });

    it('should gracefully handle edge cases', () => {
      // Empty search
      const emptyResult = avatarManager.searchAvatars('');
      expect(emptyResult.searchTime).toBeLessThan(50);

      // Non-existent user updates
      const nonExistentUpdates = [{ id: 'nonexistent', status: 'online' as const }];
      const updateResult = avatarManager.updateStatusBatch(nonExistentUpdates);
      expect(updateResult.failed).toBe(1);
      expect(updateResult.updated).toBe(0);

      // Zero viewport
      const zeroViewport = { x: 0, y: 0, width: 0, height: 0 };
      const cullResult = avatarManager.updateVisibleAvatars(zeroViewport);
      expect(cullResult.visible).toBe(0);
    });
  });
});
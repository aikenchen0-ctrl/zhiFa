# 交互式连接线与数学算法研究

## 概述
深入研究交互式连接线的拖拽编辑功能、贝塞尔曲线与路径平滑算法，以及连接线碰撞检测和自动避让技术。

## 交互式连接线拖拽编辑系统

### 1. 连接线控制点系统

```javascript
class InteractiveConnectionEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.connections = new Map();
    this.controlPoints = new Map();
    this.dragState = {
      isDragging: false,
      dragTarget: null,
      dragType: null, // 'start', 'end', 'control', 'path'
      lastMousePos: { x: 0, y: 0 }
    };
    
    this.setupEventHandlers();
  }

  createEditableConnection(id, startPos, endPos, options = {}) {
    const connection = {
      id,
      startPos: { ...startPos },
      endPos: { ...endPos },
      controlPoints: this.generateControlPoints(startPos, endPos),
      style: {
        color: options.color || '#007bff',
        width: options.width || 2,
        dashArray: options.dashArray || null
      },
      editable: options.editable !== false,
      selected: false
    };

    this.connections.set(id, connection);
    this.updateConnectionPath(connection);
    
    return connection;
  }

  generateControlPoints(start, end) {
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    const controlOffset = Math.min(distance * 0.4, 150);
    
    return {
      cp1: {
        x: start.x + controlOffset,
        y: start.y,
        visible: false
      },
      cp2: {
        x: end.x - controlOffset,
        y: end.y,
        visible: false
      }
    };
  }

  // 鼠标事件处理
  setupEventHandlers() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    
    // 键盘事件
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleMouseDown(event) {
    const mousePos = this.getMousePosition(event);
    const hitTest = this.performHitTest(mousePos);
    
    if (hitTest) {
      this.dragState.isDragging = true;
      this.dragState.dragTarget = hitTest.connection;
      this.dragState.dragType = hitTest.type;
      this.dragState.dragPoint = hitTest.point;
      this.dragState.lastMousePos = mousePos;
      
      // 选中连接线
      this.selectConnection(hitTest.connection.id);
      
      // 显示控制点
      if (hitTest.type === 'path') {
        this.showControlPoints(hitTest.connection);
      }
      
      this.canvas.style.cursor = this.getCursorForDragType(hitTest.type);
    } else {
      // 取消所有选中
      this.clearSelection();
    }
    
    this.redraw();
  }

  handleMouseMove(event) {
    const mousePos = this.getMousePosition(event);
    
    if (this.dragState.isDragging) {
      this.performDrag(mousePos);
    } else {
      this.updateCursor(mousePos);
    }
  }

  handleMouseUp(event) {
    if (this.dragState.isDragging) {
      this.completeDrag();
    }
    
    this.dragState.isDragging = false;
    this.dragState.dragTarget = null;
    this.canvas.style.cursor = 'default';
  }

  // 碰撞检测和拾取
  performHitTest(mousePos) {
    // 检测控制点
    for (const connection of this.connections.values()) {
      if (!connection.selected) continue;
      
      // 检测控制点
      const controlHit = this.testControlPoints(connection, mousePos);
      if (controlHit) {
        return {
          connection,
          type: 'control',
          point: controlHit.point,
          controlType: controlHit.type
        };
      }
      
      // 检测端点
      const endpointHit = this.testEndpoints(connection, mousePos);
      if (endpointHit) {
        return {
          connection,
          type: endpointHit.type,
          point: endpointHit.point
        };
      }
    }
    
    // 检测路径
    for (const connection of this.connections.values()) {
      if (this.testConnectionPath(connection, mousePos)) {
        return {
          connection,
          type: 'path',
          point: mousePos
        };
      }
    }
    
    return null;
  }

  testConnectionPath(connection, mousePos) {
    // 使用精确的贝塞尔曲线距离计算
    const path = this.generateBezierPath(connection);
    const tolerance = Math.max(connection.style.width, 8);
    
    return this.distanceToPath(mousePos, path) <= tolerance;
  }

  distanceToPath(point, path) {
    let minDistance = Infinity;
    const steps = 100; // 路径采样点数
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pathPoint = this.evaluateBezier(path, t);
      const distance = Math.sqrt(
        Math.pow(point.x - pathPoint.x, 2) + Math.pow(point.y - pathPoint.y, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  // 拖拽操作实现
  performDrag(currentMousePos) {
    const connection = this.dragState.dragTarget;
    const deltaX = currentMousePos.x - this.dragState.lastMousePos.x;
    const deltaY = currentMousePos.y - this.dragState.lastMousePos.y;
    
    switch (this.dragState.dragType) {
      case 'start':
        connection.startPos.x += deltaX;
        connection.startPos.y += deltaY;
        this.updateControlPointsForStart(connection);
        break;
        
      case 'end':
        connection.endPos.x += deltaX;
        connection.endPos.y += deltaY;
        this.updateControlPointsForEnd(connection);
        break;
        
      case 'control':
        this.updateControlPoint(connection, this.dragState.controlType, deltaX, deltaY);
        break;
        
      case 'path':
        // 移动整个路径
        connection.startPos.x += deltaX;
        connection.startPos.y += deltaY;
        connection.endPos.x += deltaX;
        connection.endPos.y += deltaY;
        connection.controlPoints.cp1.x += deltaX;
        connection.controlPoints.cp1.y += deltaY;
        connection.controlPoints.cp2.x += deltaX;
        connection.controlPoints.cp2.y += deltaY;
        break;
    }
    
    this.updateConnectionPath(connection);
    this.dragState.lastMousePos = currentMousePos;
    this.redraw();
    
    // 触发变化事件
    this.dispatchConnectionChangeEvent(connection);
  }

  updateControlPoint(connection, controlType, deltaX, deltaY) {
    const controlPoint = connection.controlPoints[controlType];
    controlPoint.x += deltaX;
    controlPoint.y += deltaY;
    
    // 智能控制点调整
    if (this.isSmartEditingEnabled) {
      this.applySmartControlPointConstraints(connection, controlType);
    }
  }

  applySmartControlPointConstraints(connection, controlType) {
    const cp = connection.controlPoints[controlType];
    const start = connection.startPos;
    const end = connection.endPos;
    
    // 保持控制点在合理范围内
    const maxDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    ) * 0.6;
    
    if (controlType === 'cp1') {
      const distance = Math.sqrt(
        Math.pow(cp.x - start.x, 2) + Math.pow(cp.y - start.y, 2)
      );
      
      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        cp.x = start.x + (cp.x - start.x) * ratio;
        cp.y = start.y + (cp.y - start.y) * ratio;
      }
    }
  }
}
```

### 2. 高级编辑功能

```javascript
class AdvancedConnectionEditor extends InteractiveConnectionEditor {
  constructor(canvas) {
    super(canvas);
    this.history = new EditHistory();
    this.clipboardData = null;
    this.snapToGrid = false;
    this.gridSize = 10;
    this.magneticSnapping = true;
    this.snapDistance = 15;
  }

  // 撤销重做功能
  undo() {
    const previousState = this.history.undo();
    if (previousState) {
      this.restoreState(previousState);
      this.redraw();
    }
  }

  redo() {
    const nextState = this.history.redo();
    if (nextState) {
      this.restoreState(nextState);
      this.redraw();
    }
  }

  // 复制粘贴功能
  copySelectedConnections() {
    const selectedConnections = Array.from(this.connections.values())
      .filter(conn => conn.selected);
    
    if (selectedConnections.length > 0) {
      this.clipboardData = selectedConnections.map(conn => ({
        ...conn,
        id: null // 粘贴时生成新ID
      }));
    }
  }

  pasteConnections(offsetX = 20, offsetY = 20) {
    if (!this.clipboardData) return;
    
    const newConnections = [];
    
    this.clipboardData.forEach(connData => {
      const newId = this.generateConnectionId();
      const newConnection = {
        ...connData,
        id: newId,
        startPos: {
          x: connData.startPos.x + offsetX,
          y: connData.startPos.y + offsetY
        },
        endPos: {
          x: connData.endPos.x + offsetX,
          y: connData.endPos.y + offsetY
        },
        controlPoints: {
          cp1: {
            x: connData.controlPoints.cp1.x + offsetX,
            y: connData.controlPoints.cp1.y + offsetY,
            visible: false
          },
          cp2: {
            x: connData.controlPoints.cp2.x + offsetX,
            y: connData.controlPoints.cp2.y + offsetY,
            visible: false
          }
        }
      };
      
      this.connections.set(newId, newConnection);
      newConnections.push(newConnection);
    });
    
    // 选中新粘贴的连接线
    this.clearSelection();
    newConnections.forEach(conn => conn.selected = true);
    
    this.redraw();
  }

  // 网格吸附
  snapToGridIfEnabled(point) {
    if (!this.snapToGrid) return point;
    
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize
    };
  }

  // 磁性吸附
  applyMagneticSnapping(point, excludeConnection = null) {
    if (!this.magneticSnapping) return point;
    
    let snappedPoint = { ...point };
    let minSnapDistance = this.snapDistance;
    
    // 吸附到其他连接线的端点
    for (const connection of this.connections.values()) {
      if (connection === excludeConnection) continue;
      
      const snapPoints = [
        connection.startPos,
        connection.endPos,
        connection.controlPoints.cp1,
        connection.controlPoints.cp2
      ];
      
      for (const snapPoint of snapPoints) {
        const distance = Math.sqrt(
          Math.pow(point.x - snapPoint.x, 2) + Math.pow(point.y - snapPoint.y, 2)
        );
        
        if (distance < minSnapDistance) {
          snappedPoint = { ...snapPoint };
          minSnapDistance = distance;
        }
      }
    }
    
    return snappedPoint;
  }

  // 多选功能
  startSelectionRectangle(startPoint) {
    this.selectionRectangle = {
      start: startPoint,
      current: startPoint,
      active: true
    };
  }

  updateSelectionRectangle(currentPoint) {
    if (this.selectionRectangle?.active) {
      this.selectionRectangle.current = currentPoint;
      this.selectConnectionsInRectangle();
      this.redraw();
    }
  }

  selectConnectionsInRectangle() {
    if (!this.selectionRectangle?.active) return;
    
    const rect = this.normalizeRectangle(
      this.selectionRectangle.start,
      this.selectionRectangle.current
    );
    
    for (const connection of this.connections.values()) {
      const inRect = this.isConnectionInRectangle(connection, rect);
      connection.selected = inRect;
    }
  }

  isConnectionInRectangle(connection, rect) {
    // 检查连接线的关键点是否在矩形内
    const keyPoints = [
      connection.startPos,
      connection.endPos,
      connection.controlPoints.cp1,
      connection.controlPoints.cp2
    ];
    
    return keyPoints.some(point => 
      point.x >= rect.left && point.x <= rect.right &&
      point.y >= rect.top && point.y <= rect.bottom
    );
  }
}
```

## 贝塞尔曲线与路径平滑算法

### 1. 贝塞尔曲线数学实现

```javascript
class BezierCurveEngine {
  constructor() {
    this.curveTypes = {
      QUADRATIC: 'quadratic',
      CUBIC: 'cubic',
      RATIONAL: 'rational'
    };
  }

  // 三次贝塞尔曲线评估
  evaluateCubicBezier(t, p0, p1, p2, p3) {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;
    
    return {
      x: oneMinusTCubed * p0.x + 
         3 * oneMinusTSquared * t * p1.x + 
         3 * oneMinusT * tSquared * p2.x + 
         tCubed * p3.x,
      y: oneMinusTCubed * p0.y + 
         3 * oneMinusTSquared * t * p1.y + 
         3 * oneMinusT * tSquared * p2.y + 
         tCubed * p3.y
    };
  }

  // 自适应贝塞尔曲线细分
  adaptiveSubdivide(p0, p1, p2, p3, tolerance = 1.0) {
    const points = [];
    this.subdivideRecursive(p0, p1, p2, p3, 0, 1, points, tolerance);
    return points;
  }

  subdivideRecursive(p0, p1, p2, p3, t0, t1, points, tolerance) {
    const midT = (t0 + t1) / 2;
    const midPoint = this.evaluateCubicBezier(midT, p0, p1, p2, p3);
    
    // 计算线性插值点
    const linearPoint = {
      x: p0.x + (p3.x - p0.x) * ((midT - 0) / (1 - 0)),
      y: p0.y + (p3.y - p0.y) * ((midT - 0) / (1 - 0))
    };
    
    // 计算偏差
    const deviation = Math.sqrt(
      Math.pow(midPoint.x - linearPoint.x, 2) + 
      Math.pow(midPoint.y - linearPoint.y, 2)
    );
    
    if (deviation > tolerance) {
      // 需要进一步细分
      this.subdivideRecursive(p0, p1, p2, p3, t0, midT, points, tolerance);
      this.subdivideRecursive(p0, p1, p2, p3, midT, t1, points, tolerance);
    } else {
      // 足够平滑，添加中点
      if (points.length === 0 || points[points.length - 1] !== p0) {
        points.push(p0);
      }
      points.push(midPoint);
      if (t1 === 1) {
        points.push(p3);
      }
    }
  }

  // 智能控制点计算
  calculateSmartControlPoints(startPos, endPos, options = {}) {
    const {
      curvature = 0.4,
      direction = 'auto',
      obstacles = [],
      straightThreshold = 50
    } = options;

    const distance = Math.sqrt(
      Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
    );

    // 距离太短时使用直线
    if (distance < straightThreshold) {
      return {
        cp1: {
          x: startPos.x + (endPos.x - startPos.x) * 0.25,
          y: startPos.y + (endPos.y - startPos.y) * 0.25
        },
        cp2: {
          x: startPos.x + (endPos.x - startPos.x) * 0.75,
          y: startPos.y + (endPos.y - startPos.y) * 0.75
        }
      };
    }

    // 计算基本控制点
    let controlOffset = distance * curvature;
    let cp1, cp2;

    switch (direction) {
      case 'horizontal':
        cp1 = { x: startPos.x + controlOffset, y: startPos.y };
        cp2 = { x: endPos.x - controlOffset, y: endPos.y };
        break;
        
      case 'vertical':
        cp1 = { x: startPos.x, y: startPos.y + controlOffset };
        cp2 = { x: endPos.x, y: endPos.y - controlOffset };
        break;
        
      case 'auto':
      default:
        const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
        const perpAngle = angle + Math.PI / 2;
        
        cp1 = {
          x: startPos.x + Math.cos(angle) * controlOffset,
          y: startPos.y + Math.sin(angle) * controlOffset
        };
        cp2 = {
          x: endPos.x - Math.cos(angle) * controlOffset,
          y: endPos.y - Math.sin(angle) * controlOffset
        };
        break;
    }

    // 避障处理
    if (obstacles.length > 0) {
      const adjustedCP = this.adjustControlPointsForObstacles(
        startPos, endPos, cp1, cp2, obstacles
      );
      cp1 = adjustedCP.cp1;
      cp2 = adjustedCP.cp2;
    }

    return { cp1, cp2 };
  }

  // 路径平滑算法
  smoothPath(points, smoothingFactor = 0.3) {
    if (points.length < 3) return points;
    
    const smoothedPoints = [points[0]]; // 保持起点
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // 计算平滑后的点
      const smoothed = {
        x: curr.x + (prev.x + next.x - 2 * curr.x) * smoothingFactor,
        y: curr.y + (prev.y + next.y - 2 * curr.y) * smoothingFactor
      };
      
      smoothedPoints.push(smoothed);
    }
    
    smoothedPoints.push(points[points.length - 1]); // 保持终点
    return smoothedPoints;
  }

  // Catmull-Rom样条插值
  catmullRomSpline(points, tension = 0.5) {
    if (points.length < 4) return points;
    
    const splinePoints = [];
    const steps = 10; // 每段的插值点数
    
    for (let i = 1; i < points.length - 2; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2];
      
      for (let t = 0; t <= 1; t += 1 / steps) {
        const point = this.evaluateCatmullRom(t, p0, p1, p2, p3, tension);
        splinePoints.push(point);
      }
    }
    
    return splinePoints;
  }

  evaluateCatmullRom(t, p0, p1, p2, p3, tension) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    const v0 = (p2.x - p0.x) * tension;
    const v1 = (p3.x - p1.x) * tension;
    
    const x = (2 * p1.x - 2 * p2.x + v0 + v1) * t3 + 
              (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t2 + 
              v0 * t + p1.x;
              
    const v0y = (p2.y - p0.y) * tension;
    const v1y = (p3.y - p1.y) * tension;
    
    const y = (2 * p1.y - 2 * p2.y + v0y + v1y) * t3 + 
              (-3 * p1.y + 3 * p2.y - 2 * v0y - v1y) * t2 + 
              v0y * t + p1.y;
    
    return { x, y };
  }
}
```

## 碰撞检测和自动避让

### 1. 连接线碰撞检测系统

```javascript
class ConnectionCollisionSystem {
  constructor() {
    this.connections = new Map();
    this.obstacles = new Map();
    this.spatialGrid = new SpatialGrid(50); // 50px网格
    this.avoidanceEnabled = true;
  }

  // 添加障碍物
  addObstacle(id, bounds, type = 'rectangle') {
    const obstacle = {
      id,
      bounds,
      type,
      priority: 1
    };
    
    this.obstacles.set(id, obstacle);
    this.spatialGrid.insert(obstacle, bounds);
  }

  // 检测连接线与障碍物的碰撞
  checkConnectionCollisions(connection) {
    const path = this.generatePathPoints(connection);
    const collisions = [];
    
    // 使用空间分割加速碰撞检测
    const potentialObstacles = this.spatialGrid.query(this.getPathBounds(path));
    
    for (const obstacle of potentialObstacles) {
      const collision = this.testPathObstacleCollision(path, obstacle);
      if (collision) {
        collisions.push({
          obstacle,
          intersection: collision.intersection,
          severity: collision.severity
        });
      }
    }
    
    return collisions;
  }

  testPathObstacleCollision(path, obstacle) {
    switch (obstacle.type) {
      case 'rectangle':
        return this.testPathRectangleCollision(path, obstacle.bounds);
      case 'circle':
        return this.testPathCircleCollision(path, obstacle.bounds);
      case 'polygon':
        return this.testPathPolygonCollision(path, obstacle.bounds);
      default:
        return null;
    }
  }

  testPathRectangleCollision(path, rect) {
    const intersections = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const lineStart = path[i];
      const lineEnd = path[i + 1];
      
      const intersection = this.lineRectangleIntersection(
        lineStart, lineEnd, rect
      );
      
      if (intersection) {
        intersections.push(intersection);
      }
    }
    
    if (intersections.length > 0) {
      return {
        intersection: intersections,
        severity: this.calculateCollisionSeverity(intersections, rect)
      };
    }
    
    return null;
  }

  // 自动避让算法
  generateAvoidancePath(startPos, endPos, obstacles, options = {}) {
    if (!this.avoidanceEnabled || obstacles.length === 0) {
      return this.generateDirectPath(startPos, endPos);
    }

    const {
      avoidanceDistance = 20,
      maxDetourRatio = 2.0,
      pathSmoothness = 0.5
    } = options;

    // A*路径查找算法
    const waypoints = this.findPathWithAStar(startPos, endPos, obstacles, {
      gridSize: 10,
      avoidanceDistance
    });

    if (waypoints.length === 0) {
      return this.generateDirectPath(startPos, endPos);
    }

    // 优化路径点
    const optimizedWaypoints = this.optimizePath(waypoints, obstacles);
    
    // 生成平滑的贝塞尔曲线路径
    return this.generateSmoothPathFromWaypoints(optimizedWaypoints, pathSmoothness);
  }

  findPathWithAStar(start, end, obstacles, options) {
    const { gridSize, avoidanceDistance } = options;
    
    // 构建网格
    const bounds = this.calculateSearchBounds(start, end, obstacles);
    const grid = this.createNavigationGrid(bounds, gridSize, obstacles, avoidanceDistance);
    
    // A*搜索
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    const startNode = this.worldToGrid(start, bounds, gridSize);
    const endNode = this.worldToGrid(end, bounds, gridSize);
    
    openSet.enqueue(startNode, 0);
    gScore.set(this.nodeKey(startNode), 0);
    fScore.set(this.nodeKey(startNode), this.heuristic(startNode, endNode));
    
    while (!openSet.isEmpty()) {
      const current = openSet.dequeue();
      const currentKey = this.nodeKey(current);
      
      if (this.nodesEqual(current, endNode)) {
        // 找到路径，重构路径点
        return this.reconstructPath(cameFrom, current, bounds, gridSize);
      }
      
      closedSet.add(currentKey);
      
      // 检查邻居节点
      const neighbors = this.getNeighbors(current, grid);
      for (const neighbor of neighbors) {
        const neighborKey = this.nodeKey(neighbor);
        
        if (closedSet.has(neighborKey)) continue;
        
        const tentativeGScore = gScore.get(currentKey) + this.distance(current, neighbor);
        
        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, endNode));
          
          if (!openSet.contains(neighbor)) {
            openSet.enqueue(neighbor, fScore.get(neighborKey));
          }
        }
      }
    }
    
    return []; // 没有找到路径
  }

  // 路径优化算法
  optimizePath(waypoints, obstacles) {
    if (waypoints.length <= 2) return waypoints;
    
    const optimized = [waypoints[0]];
    let current = 0;
    
    while (current < waypoints.length - 1) {
      let farthest = current + 1;
      
      // 找到最远的可直达点
      for (let i = current + 2; i < waypoints.length; i++) {
        if (this.isDirectPathClear(waypoints[current], waypoints[i], obstacles)) {
          farthest = i;
        } else {
          break;
        }
      }
      
      optimized.push(waypoints[farthest]);
      current = farthest;
    }
    
    return optimized;
  }

  isDirectPathClear(start, end, obstacles) {
    const path = this.generateLinePoints(start, end, 5); // 5px采样间距
    
    for (const obstacle of obstacles) {
      if (this.testPathObstacleCollision(path, obstacle)) {
        return false;
      }
    }
    
    return true;
  }

  // 动态避让系统
  setupDynamicAvoidance() {
    this.dynamicObstacles = new Map();
    this.avoidanceUpdateInterval = setInterval(() => {
      this.updateDynamicAvoidance();
    }, 100); // 10fps更新频率
  }

  updateDynamicAvoidance() {
    // 检查所有连接线
    for (const connection of this.connections.values()) {
      if (connection.avoidanceEnabled !== false) {
        const collisions = this.checkConnectionCollisions(connection);
        
        if (collisions.length > 0) {
          // 重新计算避让路径
          const newPath = this.generateAvoidancePath(
            connection.startPos,
            connection.endPos,
            collisions.map(c => c.obstacle),
            connection.avoidanceOptions
          );
          
          // 平滑过渡到新路径
          this.transitionToNewPath(connection, newPath);
        }
      }
    }
  }

  transitionToNewPath(connection, newPath) {
    if (!connection.currentPath) {
      connection.currentPath = newPath;
      return;
    }

    // 创建路径间的平滑过渡动画
    const transition = {
      fromPath: connection.currentPath,
      toPath: newPath,
      progress: 0,
      duration: 300 // ms
    };

    this.animatePathTransition(connection, transition);
  }

  animatePathTransition(connection, transition) {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / transition.duration, 1);
      
      // 使用缓动函数
      const easedProgress = this.easeInOutCubic(progress);
      
      // 插值路径点
      connection.currentPath = this.interpolatePaths(
        transition.fromPath,
        transition.toPath,
        easedProgress
      );
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
}
```

## 空间分割优化

### 1. 空间网格系统

```javascript
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objects = new Map();
  }

  insert(object, bounds) {
    const cells = this.getCellsForBounds(bounds);
    
    this.objects.set(object.id, {
      object,
      bounds,
      cells: new Set(cells)
    });
    
    for (const cell of cells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell).add(object.id);
    }
  }

  query(bounds) {
    const cells = this.getCellsForBounds(bounds);
    const resultSet = new Set();
    
    for (const cell of cells) {
      const cellObjects = this.grid.get(cell);
      if (cellObjects) {
        for (const objectId of cellObjects) {
          resultSet.add(this.objects.get(objectId).object);
        }
      }
    }
    
    return Array.from(resultSet);
  }

  getCellsForBounds(bounds) {
    const cells = [];
    
    const startX = Math.floor(bounds.left / this.cellSize);
    const endX = Math.floor(bounds.right / this.cellSize);
    const startY = Math.floor(bounds.top / this.cellSize);
    const endY = Math.floor(bounds.bottom / this.cellSize);
    
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    
    return cells;
  }
}
```

通过这些深入的技术研究，我们完成了对动态连接线系统的全面分析。从基础的Canvas和SVG实现，到高性能的WebGL解决方案，再到专业库的对比和实时位置跟踪技术，最后到交互式编辑和数学算法，为开发者提供了完整的技术选型和实现指南。
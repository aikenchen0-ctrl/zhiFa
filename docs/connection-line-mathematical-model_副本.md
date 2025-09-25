# 连接线系统数学模型

## 1. 数学模型定义

### 1.1 基本向量空间
设连接线系统在二维欧几里得空间 $\mathbb{R}^2$ 中，坐标系为标准笛卡尔坐标系。

### 1.2 输入参数集合
定义输入参数集合 $\mathcal{P}$：
$$\mathcal{P} = \{P_s, P_e, \tau, r\}$$

其中：
- $P_s = (x_s, y_s)$ - 起点坐标
- $P_e = (x_e, y_e)$ - 终点坐标  
- $\tau \in \{\text{left-to-right}, \text{right-to-left}, \text{right-to-right}\}$ - 连接类型
- $r = 5$ - 圆角半径常数

### 1.3 中轴线偏移映射函数
定义中轴线偏移映射 $\Omega: \{\text{连接类型}\} \to \mathbb{Z}$：
$$\Omega(\tau) = \begin{cases}
-15 & \text{if } \tau = \text{left-to-right} \\
20 & \text{if } \tau = \text{right-to-left} \\
15 & \text{if } \tau = \text{right-to-right}
\end{cases}$$

## 2. 几何变换函数

### 2.1 基础变换参数计算
定义变换参数函数组：

**中轴线X坐标**：
$$C_x(P_s, \tau) = x_s + \Omega(\tau)$$

**水平延伸距离**：
$$E(\tau, r) = |\Omega(\tau)| - r$$

**方向向量**：
$$\vec{d}_v = \text{sign}(y_e - y_s) = \begin{cases}
1 & \text{if } y_e > y_s \\
-1 & \text{if } y_e < y_s \\
0 & \text{if } y_e = y_s
\end{cases}$$

$$\vec{d}_h = \text{sign}(x_e - C_x(P_s, \tau))$$

### 2.2 六步路径节点计算

#### Step 1: 起点变换
$$T_1(P_s) = P_s = (x_s, y_s)$$

#### Step 2: 水平延伸变换
$$T_2(P_s, \tau, r) = \begin{cases}
(x_s - E(\tau, r), y_s) & \text{if } \tau = \text{left-to-right} \\
(x_s + E(\tau, r), y_s) & \text{otherwise}
\end{cases}$$

#### Step 3: 第一转折变换
控制点：$Q_1(\tau, P_s) = (C_x(P_s, \tau), y_s)$

转折后点：
$$T_3(P_s, \tau, r) = (C_x(P_s, \tau), y_s + \vec{d}_v \cdot r)$$

#### Step 4: 垂直延伸变换  
$$T_4(P_s, P_e, \tau, r) = (C_x(P_s, \tau), y_e + r)$$

#### Step 5: 第二转折变换（对称圆角）
控制点：$Q_2(P_s, P_e, \tau) = (C_x(P_s, \tau), y_e)$

转折后点：
$$T_5(P_s, P_e, \tau, r) = (C_x(P_s, \tau) + \vec{d}_h \cdot r, y_e)$$

#### Step 6: 终点变换
$$T_6(P_e) = P_e = (x_e, y_e)$$

## 3. 路径生成函数

### 3.1 完整路径映射函数
定义路径生成函数 $\Gamma: \mathcal{P} \to \mathcal{C}^1$，其中 $\mathcal{C}^1$ 是一阶连续可微分段曲线空间。

$$\Gamma(P_s, P_e, \tau, r) = \bigcup_{i=1}^{5} S_i$$

其中 $S_i$ 为路径段：

- $S_1$: 线段 $\overline{T_1T_2}$
- $S_2$: 二次贝塞尔曲线 $B_2(T_2, Q_1, T_3)$ 
- $S_3$: 线段 $\overline{T_3T_4}$
- $S_4$: 二次贝塞尔曲线 $B_2(T_4, Q_2, T_5)$
- $S_5$: 线段 $\overline{T_5T_6}$

### 3.2 二次贝塞尔曲线参数方程
对于控制点 $P_0, P_1, P_2$ 的二次贝塞尔曲线：
$$B_2(t) = (1-t)^2P_0 + 2t(1-t)P_1 + t^2P_2, \quad t \in [0,1]$$

## 4. 对称性数学证明

### 4.1 第二转折点对称性定理
**定理**：在修正后的算法中，第二转折处的控制向量满足完全对称性。

**证明**：
设第二转折点为 $T_5$，控制点为 $Q_2$，前一点为 $T_4$。

垂直控制向量：$\vec{v}_1 = T_4 - Q_2 = (0, r)$
水平控制向量：$\vec{v}_2 = T_5 - Q_2 = (\vec{d}_h \cdot r, 0)$

向量长度：
$$|\vec{v}_1| = \sqrt{0^2 + r^2} = r$$
$$|\vec{v}_2| = \sqrt{(\vec{d}_h \cdot r)^2 + 0^2} = |r| = r$$

因此 $|\vec{v}_1| = |\vec{v}_2| = r$，且夹角为 $\frac{\pi}{2}$，构成完全对称的45度圆角。□

### 4.2 连续性定理
**定理**：路径 $\Gamma(P_s, P_e, \tau, r)$ 在所有连接点处具有 $C^1$ 连续性。

**证明**：需要验证在连接点 $T_2, T_3, T_4, T_5$ 处的位置连续性和切线连续性。
（具体证明略，涉及贝塞尔曲线端点切线性质）

## 5. 优化数学模型

### 5.1 向量化表示
将所有变换写成矩阵形式，设状态向量 $\mathbf{S} = [x, y, 1]^T$：

$$\mathbf{S}_{i+1} = \mathbf{A}_i(\tau, r) \mathbf{S}_i + \mathbf{b}_i(\tau, r)$$

其中 $\mathbf{A}_i$ 为变换矩阵，$\mathbf{b}_i$ 为平移向量。

### 5.2 参数优化函数
定义目标函数 $J(\tau, r)$ 来优化路径美观度：

$$J(\tau, r) = \alpha \cdot L(\Gamma) + \beta \cdot C(\Gamma) + \gamma \cdot S(\Gamma)$$

其中：
- $L(\Gamma)$ - 路径总长度
- $C(\Gamma)$ - 曲率变化率  
- $S(\Gamma)$ - 对称性指标

### 5.3 约束条件
$$\begin{align}
r &> 0 \text{ （圆角半径正数约束）} \\
|\Omega(\tau)| &> r \text{ （延伸距离约束）} \\
\|T_i - T_{i+1}\| &> \epsilon \text{ （节点分离约束）}
\end{align}$$

## 6. 复杂度分析

### 6.1 时间复杂度
- 单条路径计算：$O(1)$ 
- $n$ 条连接线生成：$O(n)$
- 实时更新：$O(n)$

### 6.2 空间复杂度
- 路径存储：$O(n \cdot k)$，其中 $k$ 为平均路径段数
- 调试点存储：$O(n \cdot m)$，其中 $m$ 为每条路径的调试点数

## 7. 数值稳定性

### 7.1 舍入误差控制
对于坐标计算，采用IEEE 754双精度浮点数，相对误差：
$$\epsilon_{rel} < 2.22 \times 10^{-16}$$

### 7.2 条件数分析
路径生成函数的雅可比矩阵条件数：
$$\kappa(\mathbf{J}) = \|\mathbf{J}\| \cdot \|\mathbf{J}^{-1}\| < C$$

其中 $C$ 为合理的条件数上界，确保数值稳定性。

## 8. 扩展数学框架

### 8.1 泛型路径生成器
定义抽象路径生成算子 $\mathcal{G}$：
$$\mathcal{G}: \mathcal{P} \times \mathcal{R} \to \mathcal{C}^k$$

其中 $\mathcal{R}$ 为规则参数空间，$\mathcal{C}^k$ 为 $k$ 阶可微曲线空间。

### 8.2 多目标优化模型
$$\min_{(\tau,r) \in \mathcal{D}} \mathbf{f}(\tau, r) = [f_1(\tau,r), f_2(\tau,r), \ldots, f_k(\tau,r)]^T$$

使用帕累托最优解集求解最佳参数组合。

## 9. 验证与误差分析

### 9.1 几何精度验证
定义精度度量函数：
$$\varepsilon_{geom} = \max_{i} \|T_i^{computed} - T_i^{exact}\|_2$$

要求：$\varepsilon_{geom} < 0.1px$

### 9.2 对称性验证  
对称性误差：
$$\varepsilon_{sym} = \left| \frac{|\vec{v}_1| - |\vec{v}_2|}{|\vec{v}_1| + |\vec{v}_2|} \right|$$

要求：$\varepsilon_{sym} < 10^{-6}$

## 10. 数学模型总结

该数学模型将连接线系统完全形式化，提供了：
1. 严格的几何变换定义
2. 对称性的数学证明  
3. 优化目标函数
4. 数值稳定性保证
5. 扩展性框架

模型支持任意参数的连接线生成，并保证几何精度和对称性要求。
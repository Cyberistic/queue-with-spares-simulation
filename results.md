# Queueing System Simulation Results

## 1D Birth-Death Simulation

### Parameters

$M = 10$
$s = 2$
$K = 5$
$\lambda = 0.5$
$\mu = 2$
$T_{sim} = 75189.99$
$N_{transitions} = 500,000$

Here,

$$
T_{\text{sim}} = \sum_{k=1}^{N} \Delta t_k
$$

where each inter-event time is sampled as

$$
\Delta t_k = -\frac{\ln(U_k)}{q(x_k)}
$$

with $U_k \sim \mathrm{Uniform}(0,1)$ and $q(x_k)$ equal to the total outgoing rate from the current state $x_k$.

### Performance Metrics

| Metric | Symbol | Simulation | Theoretical | Error % |
|--------|--------|-----------|-------------|---------|
| Avg Customers | L | 2.655414 | 2.653046 | 0.09% |
| Avg in Queue | L_q | 0.989903 | 0.988076 | 0.18% |
| Throughput | X | 3.324897 | 3.673477 | 9.49% |
| Blocking Prob | P_{block} | 0.093683 | 0.093518 | 0.18% |
| Server Utilization | U | 0.832755 | 0.832485 | 0.03% |
| Avg Time in System | W | 0.798645 | 0.722217 | 10.58% |
| Avg Time in Queue | W_q | 0.297725 | 0.268976 | 10.69% |

### State Probabilities

| State | Simulation P | Theoretical P |
|-------|--------------|---------------|
| S0 | 0.074049 | 0.074451 |
| S1 | 0.186392 | 0.186128 |
| S2 | 0.208611 | 0.209394 |
| S3 | 0.209606 | 0.209394 |
| S4 | 0.183730 | 0.183219 |
| S5 | 0.137613 | 0.137415 |

### 1D Balance Equations

#### Arrival Rate

$$\lambda_n = (M - n) \lambda$$

$$\lambda_n = (10 - n) \times 0.50$$

#### Service Rate

$$\mu_n =
\begin{cases}
n\mu, & n < s \\
s\mu, & n \ge s
\end{cases}$$

$$\mu_n =
\begin{cases}
n \times 2.00, & n < 2 \\
2 \times 2.00 = 4.00, & n \ge 2
\end{cases}$$

#### Normalization

$$\sum_{n=0}^{K} P_n = 1$$

$$\sum_{n=0}^{5} P_n = 1$$

## 2D Queue with Spares Simulation

### Parameters

$M = 10$
$s = 2$
$K = 5$
$\lambda = 0.5$
$\mu = 2$
$Y = 5$
$\alpha = 1$
$\beta = 1.5$
$T_{sim} = 47040.14$
$N_{transitions} = 500,000$

Here,

$$
T_{\text{sim}} = \sum_{k=1}^{N} \Delta t_k
$$

where each inter-event time is sampled as

$$
\Delta t_k = -\frac{\ln(U_k)}{q(x_k)}
$$

with $U_k \sim \mathrm{Uniform}(0,1)$ and $q(x_k)$ equal to the total outgoing rate from the current state $x_k$.

### Performance Metrics

| Metric | Symbol | Simulation | Theoretical | Error % |
|--------|--------|-----------|-------------|---------|
| Avg Customers | L | 2.666728 | 2.655743 | 0.41% |
| Avg Failed Servers | j_{avg} | 1.328256 | 1.331700 | 0.26% |
| Throughput | X | 3.318506 | 3.327475 | 0.27% |
| Blocking Prob | P_{block} | 0.094815 | 0.093857 | 1.02% |
| Availability | A | 0.999831 | 0.999804 | 0.00% |

### State Probabilities

| State | Simulation P | Theoretical P |
|-------|--------------|---------------|
| (0,0) | 0.019816 | 0.019621 |
| (0,1) | 0.026111 | 0.026152 |
| (0,2) | 0.017176 | 0.017420 |
| (0,3) | 0.007533 | 0.007725 |
| (0,4) | 0.002411 | 0.002556 |
| (0,5) | 0.000635 | 0.000665 |
| (0,6) | 0.000102 | 0.000135 |
| (0,7) | 0.000003 | 0.000009 |
| (1,0) | 0.050205 | 0.049058 |
| (1,1) | 0.063645 | 0.065394 |
| (1,2) | 0.042430 | 0.043568 |
| (1,3) | 0.018995 | 0.019327 |
| (1,4) | 0.006372 | 0.006398 |
| (1,5) | 0.001641 | 0.001655 |
| (1,6) | 0.000283 | 0.000305 |
| (1,7) | 0.000026 | 0.000023 |
| (2,0) | 0.056004 | 0.055201 |
| (2,1) | 0.072480 | 0.073591 |
| (2,2) | 0.048078 | 0.049044 |
| (2,3) | 0.021741 | 0.021775 |
| (2,4) | 0.007380 | 0.007233 |
| (2,5) | 0.001855 | 0.001903 |
| (2,6) | 0.000427 | 0.000401 |
| (2,7) | 0.000033 | 0.000035 |
| (3,0) | 0.055720 | 0.055214 |
| (3,1) | 0.073732 | 0.073622 |
| (3,2) | 0.048926 | 0.049085 |
| (3,3) | 0.022135 | 0.021820 |
| (3,4) | 0.007493 | 0.007278 |
| (3,5) | 0.001877 | 0.001944 |
| (3,6) | 0.000473 | 0.000435 |
| (3,7) | 0.000043 | 0.000041 |
| (4,0) | 0.048052 | 0.048325 |
| (4,1) | 0.064815 | 0.064448 |
| (4,2) | 0.044017 | 0.042990 |
| (4,3) | 0.019303 | 0.019137 |
| (4,4) | 0.006672 | 0.006412 |
| (4,5) | 0.001795 | 0.001742 |
| (4,6) | 0.000462 | 0.000412 |
| (4,7) | 0.000042 | 0.000041 |
| (5,0) | 0.036764 | 0.036250 |
| (5,1) | 0.048685 | 0.048352 |
| (5,2) | 0.032736 | 0.032266 |
| (5,3) | 0.014540 | 0.014382 |
| (5,4) | 0.004571 | 0.004844 |
| (5,5) | 0.001414 | 0.001351 |
| (5,6) | 0.000329 | 0.000369 |
| (5,7) | 0.000021 | 0.000047 |

### 2D Balance Equations

### Arrival Rate

$$\lambda_n = (M - n) \lambda$$

$$\lambda_n = (10 - n) \times 0.50$$

### Service Rate

$$\mu_{n,j} = \min(n, c(j)) \mu, \quad c(j) = \min(s, s+Y-j)$$

$$\mu_{n,j} = \min(n, c(j)) \times 2.00, \quad c(j) = \min(2, 7-j)$$

### Failure Rate

$$\alpha_j = c(j) \alpha$$

$$\alpha_j = c(j) \times 1.000$$

### Repair Rate

$$\beta_j = j \beta$$

$$\beta_j = j \times 1.50$$

### Normalization

$$\sum_{n=0}^{K} \sum_{j=0}^{7} P_{n,j} = 1$$

$$\sum_{n=0}^{5} \sum_{j=0}^{7} P_{n,j} = 1$$

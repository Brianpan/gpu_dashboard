# Dashboard of GPU comparison
## Goal
We want to do a battle-test of GPU Build our own vs. host on neo cloud vs. frontier model
The matrix the compare
- 1M token cost
- Cost per task

Split this single page application into 3 part
- Build our own server
- Rent the GPU
- Frontier model


first 2 share a selector GPU types
- b300
- b200
- h200
- h100

and open models
- QWEN 3.8
- QWEN 3.8 Flash Next

and gpu number with
- 1
- 2

we assume our gpu usage is 16 parallel requests to benchmark throughput tps

our inference engine is SGLang

the SPA is written in javascript, typescript without react.js
the top rows show the benchmark 1M token cost
cost per task with adjustment
### thoughput calculation
https://github.com/sgl-project/sglang/issues/41919
find them by searching from github
create a csv called throughput.csv for h100,h200,b200,b300 with 16 parallel requests tps

the adjustment of cost per task
https://artificialanalysis.ai/leaderboards/models
for build our own device, we adjust by cost per 1M token from (ours / cloud provider)*(task cost from the sheet)

The design style follows clean, dark theme
## Build our own server
- cost of GPU: fixed when select
    - have a MSRP
- electricity (CA, TX, NY)
    - source: https://www.electricchoice.com/electricity-prices-by-state/ 
- depreciation years for assets: to calculate avg month of cost per gpu
    - 3
    - 5
    - 7
    - 10
## Rent the GPU
- Original datasource:
    - https://github.com/Brianpan/gpu-rental-prices/tree/main/data/snapshots
    - you need to do preprocess to create a gpu.csv file to avg the rental price by date
- Moving avg
    - 3
    - 5
    - 7
    - 14
## Closed model
create a closed model sheet for Fable 5.2, GPT 6.2
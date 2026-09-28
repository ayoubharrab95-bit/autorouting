import { getSimpleRouteJson } from "solver-utils"
import { test, expect } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { MultilayerIjump } from "../MultilayerIjump"

const OneByOnePad = (props: {
  name: string
  pcbX?: number
  pcbY?: number
  layer: string
}) => (
  <chip name={props.name} pcbX={props.pcbX} pcbY={props.pcbY}>
    <footprint>
      <smtpad
        pcbX={0}
        pcbY={0}
        shape="rect"
        width="1mm"
        height="1mm"
        layer={props.layer as any}
        portHints={["pin1"]}
      />
    </footprint>
  </chip>
)

test("no wild trace jumps when obstacle forces direction change", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="10mm" routingDisabled>
      <OneByOnePad name="U1" pcbX={-7} layer="top" />
      <OneByOnePad name="U2" pcbX={7} layer="top" />
      <chip name="obstacle" pcbX={0} pcbY={0}>
        <footprint>
          <smtpad
            pcbX={0}
            pcbY={0}
            shape="rect"
            width="8mm"
            height="6mm"
            layer="top"
            portHints={["pin1"]}
          />
        </footprint>
      </chip>
      <trace from=".U1 > .pin1" to=".U2 > .pin1" />
    </board>,
  )

  const input = getSimpleRouteJson(circuit.getCircuitJson(), { layerCount: 2 })
  const autorouter = new MultilayerIjump({
    input,
    VIA_COST: 2,
  })

  const solution = autorouter.solveAndMapToTraces()
  expect(solution).toHaveLength(1)

  const boardDiagonal = Math.sqrt(20 * 20 + 10 * 10)
  if (solution[0]?.type === "pcb_trace") {
    const route = solution[0].route
    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1]
      const curr = route[i]
      if (prev.route_type === "wire" && curr.route_type === "wire") {
        const segmentLength = Math.sqrt(
          (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2,
        )
        expect(segmentLength).toBeLessThan(boardDiagonal * 2)
      }
    }
  }
})

import React, { Component, EventHandler, SyntheticEvent } from 'react';
import logo from './logo.svg';
import './App.scss';
import { List, Map, fromJS } from "immutable";
import Drawing, { IDrawingProps } from "./Drawing";

enum PenMode {
  DRAW = "DRAW",
  ERASE = "ERASE"
}

export interface IAppState {
  isDrawing: boolean
  lines: List<List<Map<string, number>>>
  mode: PenMode,
  isMouseDown: boolean
}

export const svgViewBox = {
  height: 300,
  originX: 0,
  originY: 0,
  width: 200,
  //get top() {
  //  
  //}
}

class App extends Component<any, IAppState> {

  state: Readonly<IAppState> = {
    lines: List(),
    isDrawing: false,
    mode: PenMode.DRAW,
    isMouseDown: false
  }

  private getRectBounds = () => {
    return (this.refs.drawArea as HTMLDivElement).getBoundingClientRect()
  }

  //TODO: reimplement so that it works with a defined SVG viewbox as per notes
  relativeCoordinatesForEvent = (e: SyntheticEvent<HTMLElement, MouseEvent>): Map<string, number> => {
    const rectBounds = this.getRectBounds();
    const reletivePoints = {
      x: e.nativeEvent.clientX - rectBounds.left,
      y: e.nativeEvent.clientY - rectBounds.top
    }

    /**
     * FIXME: this does not work as intended
     * - scaling to svg viewbox works I think
     * - Moving that point to where the pointer is touching does not
     */
    const relSvgPoints = {
      x: reletivePoints.x * (svgViewBox.width / rectBounds.width),
      y: reletivePoints.y * (svgViewBox.height / rectBounds.height)
    }
    console.log("points", { svgViewBox, reletivePoints, relSvgPoints })

    return Map(reletivePoints)
  }



  handlePointerDown = (e: SyntheticEvent<HTMLDivElement, MouseEvent>) => {
    if (e.nativeEvent.button !== 0) {
      return
    }

    if (this.state.mode === PenMode.ERASE) {
      this.setState({
        isMouseDown: true
      })
    } else {
      const point = this.relativeCoordinatesForEvent(e)

      this.setState(prevState => {
        return {
          lines: prevState.lines.push(List([point])),
          isDrawing: true,
          isMouseDown: true
        }
      })
    }


  }


  handlePointerUp = () => {
    this.setState({
      isDrawing: false,
      isMouseDown: false
    })
  }

  handlePointerMove = (e: SyntheticEvent<HTMLDivElement, MouseEvent>) => {
    if (!this.state.isDrawing || this.state.mode === PenMode.ERASE) {
      return;
    }
    const point = this.relativeCoordinatesForEvent(e)

    this.setState(prevState => ({
      lines: prevState.lines.updateIn([prevState.lines.size - 1], line => line.push(point))
    }))
  }

  pathIntersectionHandler: IDrawingProps["pathIntersectionListener"] = (e, data, line) => {
    const { prevPoint, nextPoint, intersection: { approximationMethod, point } } = data;
    if (this.state.mode === PenMode.ERASE && this.state.isMouseDown) {
      console.log("intersection detected")
      console.log("line", line)
      console.log('point', point)

      //console.log("line key, val",this.state.lines.findEntry(l => l.equals(line)))

      //TODO: new lines when to be created when points are deleted. Simply removing the points is not enough
      //TODO: some form of state history for the lines part of the state needs to be implemented
      this.setState(prevState => {
        const oldLineIndex = prevState.lines.findIndex(l => l.equals(line))
        if (oldLineIndex !== -1) {
          const nextPointIndex = line.findIndex(p => p.equals(nextPoint))
          const prevPointIndex = line.findIndex(p => p.equals(prevPoint))
          if (nextPointIndex !== -1 && prevPointIndex !== -1) {
            const pointIndex = approximationMethod === "exact" ? line.findIndex(p => p.equals(point)) : null
            let newLine = line;
            if (pointIndex !== -1 && pointIndex !== null) {
              newLine = newLine.remove(pointIndex)
              console.log("point removed", { pointIndex, point })
            }
            newLine = newLine.remove(nextPointIndex).remove(prevPointIndex)
            console.log("prevpoint removed", { prevPointIndex, prevPoint })
            console.log("nextpoint removed", { nextPointIndex, nextPoint })
            console.log("new line", newLine)
            return {
              lines: prevState.lines.set(oldLineIndex, newLine)
            }
          } else {
            return null
          }
        } else {
          return null
        }


      })
    }

  }

  handleModeToggle = (e: SyntheticEvent<HTMLButtonElement>) => {
    this.setState(prevState => ({
      mode: prevState.mode === PenMode.DRAW ? PenMode.ERASE : PenMode.DRAW
    }))
  }


  private restore: any
  deleteStateAndSave = () => {
    if (this.state.lines.isEmpty() || this.state.lines === null) {
      console.error("State is empty")
    } else {
      this.setState(ps => {
        this.restore = ps.lines;
        return { lines: ps.lines.clear() }
      })
    }
  }
  restoreState = () => {
    if (this.state.lines.size !== 0 || this.restore === null){
      console.error("state is occupied or there is nothing to restore",{restore:this.restore,state:this.state})
    }else{
      this.setState({
        lines:this.restore
      })
    }
  }

  render() {
    return (
      <>
        <h1>Draw below</h1>
        <span> <button onClick={this.handleModeToggle} >Toggle mode</button> <h3>Mode {this.state.mode}</h3></span>
        <button onClick={this.deleteStateAndSave}>Save and delete</button>
        <button onClick={this.restoreState} >Restore</button>
        <div ref="drawArea" style={{ width: "100%", height: "100%" }}
          onMouseDown={this.handlePointerDown}
          onMouseUp={this.handlePointerUp}
          onMouseMove={this.handlePointerMove}
        >
          <Drawing relativeCoordinatesForEvent={this.relativeCoordinatesForEvent} lines={this.state.lines} pathIntersectionListener={this.pathIntersectionHandler} />
        </div>
      </>
    );
  }
}

export default App;

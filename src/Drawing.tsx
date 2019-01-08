import React, { Props, SyntheticEvent } from "react"
import { List, Map, Record,  } from "immutable";
import App, { IAppState, svgViewBox } from "./App";

//interface IDrawingProps extends Props<any> {
//  lines: List<Map<string, number>>
//}

type approximation = "exact" | "vertical" | "linear"
interface _CriticalPoints {
  intersection : {
    point:Map<string, number>,
    approximationMethod:approximation
  }
  prevPoint:Map<string, number>
  nextPoint:Map<string, number>
}

type CriticalPoints = Record<_CriticalPoints> & Readonly<_CriticalPoints>


const CriticalPoints = (cp:_CriticalPoints): CriticalPoints => Record(cp)(cp);

//class CriticalPoints extends Record({}){
//  constructor(_cp:_CriticalPoints){
//    super(_cp)
//    for(const prop in _cp){
//      
//      Object.defineProperty(this, prop, {
//        value: _cp[prop]
//      })
//    }
//  }
//
//  public readonly {}
//}


export interface IDrawingProps extends Pick<IAppState, "lines">, Props<any> {
  pathIntersectionListener?: (e: SyntheticEvent<SVGPathElement, MouseEvent>, data:CriticalPoints, line: IDrawnLineProps["line"]) => void,
  relativeCoordinatesForEvent: (e: SyntheticEvent<HTMLElement, MouseEvent>) => Map<string, number>
}
/**
 * Functional component
 * @param props 
 */
const Drawing = (props: IDrawingProps) => {

  const testingFunctions = {
    clickHandle: (e:SyntheticEvent<SVGElement, MouseEvent>) => console.log("svg points",{
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY
    })
  }

  const viewBox = `${svgViewBox.originX} ${svgViewBox.originY} ${svgViewBox.width} ${svgViewBox.height}`
  return (
    <svg  className="drawing" style={{ width: "100%", height: "100%" }} >
      {props.lines.map((line, index) => (
        <DrawnLine relativeCoordinatesForEvent={props.relativeCoordinatesForEvent} pathIntersectionListener={props.pathIntersectionListener} key={index} line={line} />
      ))}
    </svg>
  )
}

export interface IDrawnLineProps extends Props<any>, Pick<IDrawingProps, "pathIntersectionListener">, Pick<IDrawingProps, "relativeCoordinatesForEvent"> {
  line: List<Map<string, number>>
}
/**
 * Subcomponent
 * @param props {IDrawlineProps}
 */
const DrawnLine = (props: IDrawnLineProps) => {

  const pathIntersectionListenerProxy = (e: SyntheticEvent<SVGPathElement, MouseEvent>): void => {

    if (props.pathIntersectionListener !== undefined && e.nativeEvent.button === 0) {
      //console.log("onPointerOverPath listener proxy fired")

      const possibleIntersectionPoint = props.relativeCoordinatesForEvent((e as unknown) as SyntheticEvent<HTMLElement, MouseEvent>)
      //let intersectionPoint: any

      let intersectionData:CriticalPoints | null = null;
      const doesIntersect = props.line.some((point, key, list) => {

        const nextPoint = list.get(key + 1)
        if (!nextPoint) {
          // if the end of the list is reached without
          // the predicate being met return false
          return false
        } else {


          const y1 = point.get("y")!; // is also lower bound of domain in linear relation
          const x1 = point.get("x")!;
          const possibleIntersectionPointX = possibleIntersectionPoint.get("x")!
          const possibleIntersectionPointY = possibleIntersectionPoint.get("y")!
          // check if mouse point exists in the list
          if (x1 === possibleIntersectionPointX && y1 === possibleIntersectionPointY) {
            console.log("point found in list")
            intersectionData = CriticalPoints({
              intersection: {
                approximationMethod: "exact",
                point:possibleIntersectionPoint
              },
              nextPoint: nextPoint,
              prevPoint: point
            })
            return true
          }

          const y2 = nextPoint.get("y")!; // is also upper bound of domain in linear relation
          const x2 = nextPoint.get("x")!;

          // check if points are vertical to each other
          // if they are see if mouse point exists between the two
          if (x1 === x2) {
            const lowerBound = y1 <= y2 ? y1 : y2;
            const upperBound = y1 >= y2 ? y1 : y2;
            
            if (possibleIntersectionPointY >= lowerBound && possibleIntersectionPointY <= upperBound) {
              console.log("point found between two points vertically")
              console.log("point 1", point)
              console.log("point 2", nextPoint)
              intersectionData = CriticalPoints({
                intersection: {
                  approximationMethod: "vertical",
                  point:possibleIntersectionPoint
                },
                nextPoint: nextPoint,
                prevPoint: point
              })
              return true
            } else {
              return false
            }
          }
          // otherwise the points have a linear relation to eachother
          const slope = (y2 - y1) / (x2 - x1)
          const b = (-x1 * slope) + y1;
          // linear function of point and next point
          const linFunc = (x: number): number => {
            return (slope * x) + b;
          }


          const linEstimate = linFunc(possibleIntersectionPointX);

          if (linEstimate === possibleIntersectionPointY && linEstimate <= y2 && linEstimate >= y1) {
            console.log("point found between two points linearly")
            console.log("point 1", point)
            console.log("point 2", nextPoint)
            intersectionData = CriticalPoints({
              intersection: {
                approximationMethod: "linear",
                point:possibleIntersectionPoint
              },
              nextPoint: nextPoint,
              prevPoint: point
            })
            return true
          } else {
            return false
          }
        }
      })

      if (doesIntersect && intersectionData) {
        //console.log("does intersect")
        props.pathIntersectionListener(e, intersectionData, props.line)
      }

    } else {
      console.log("pathlister is undefined")
    }
  }

  const pathData = "M " + props.line
    .map(p => {
      return `${p.get('x')} ${p.get('y')}`
    })
    .join(" L ");
  //console.log("In DrawnLine", pathData)
  return <path onMouseMove={pathIntersectionListenerProxy} fill="none" stroke="black" className="path" d={pathData} />
}

export default Drawing
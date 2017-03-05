import 'aframe';
import 'aframe-animation-component';
import 'aframe-html-shader';
import {Entity, Scene} from 'aframe-react';
import Camera from "./Camera.jsx";
import ArrayHelper from "../helper";
import BasicSquare from "./basicSquare.jsx";
import Hint from "./Hint.jsx";
import Cursor from "./Cursor.jsx";
import {FigureHelper} from "../FigureHelper";
import React from 'react';
import {HtmlContainer} from "./HtmlContainer.jsx";
import DeepCopy from '../DeepCopy';
import GameField from './GameField.jsx';
import StartBtn from './StartBtn.jsx';
import Score from './Score.jsx';
import "../styles.less";

export class VRScene extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            player: {
                pos: {x: 0, y: 0},
                matrix: null,
                score: 0,
            },
            field:[],
            isStarted: false
        };
        this.initField();
        this.initKeyboardControlls();
        this.startGame = this.startGame.bind(this);
    }
    startGame(){
        this.state.player.matrix = FigureHelper.getFigure();
        var id = setInterval(() => {
            var player = DeepCopy(this.state.player);
            player.pos.y++;
            if (this.isCollide(player)) {
                player.pos.y--;
                this.merge();
                this.checkAndRemoveFullRows(player);
                player.matrix = FigureHelper.getFigure();
                player.pos.y = 0;
                player.pos.x = Math.floor(this.props.size.j/2) - Math.floor(player.matrix.length/2);
            }
            this.setState({player: player});
        }, 1000);
        this.setState({ isStarted: true, id: id});
    }
    checkAndRemoveFullRows(player){
      var rowCount = 0;
      var field = DeepCopy(this.state.field);
      for (var y = field.length - 1; y > 0; y--) {
        if (field[y].indexOf(0) != -1) {
          continue;
        }

          var row = field.splice(y, 1)[0].fill(0);
          field.unshift(row);
          y++;

          rowCount = rowCount ? rowCount * 2 : 1;

          player.score += rowCount * 10;
          rowCount *= 2;
      }

      if (rowCount){
        this.setState({field: field});
      }
    }
    initField(){
        const [ROWS, COLUMNS] = [this.props.size.i, this.props.size.j];
        var clearField = [];

        for (var i = 0; i < ROWS; i++) {
            clearField.push(new Array(COLUMNS).fill(0));
        }

        //this.setState({field: clearField});
        this.state.field = clearField;
    }
    rotate(){
        var player = DeepCopy(this.state.player);
        player.matrix = ArrayHelper.rotateClockwise(player.matrix);
        var offset = 1;
        const originalPos = player.pos.x;

        while (this.isCollide(player)) {
            player.pos.x = originalPos + offset;
            offset = offset > 0 ? -offset : -offset + 1;
            if (offset > player.matrix[0].length) {
                player.pos.x = originalPos;
                return;
            }
        }
        this.setState({player: player});
    }

    merge() {
        //merge player figure and game field
        var field = DeepCopy(this.state.field);
        var {player} = this.state;
        player.matrix.forEach((row, rowIndex) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    field[rowIndex + player.pos.y][x + player.pos.x] = value;
                }
            });
        });

        this.setState({field: field});
    }
    isCollide(player){
        var {matrix, pos} = player;
        var field = this.state.field;

        for (var i = 0; i < matrix.length; i++) {
            for (var j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] && (!field[i + pos.y] || field[i + pos.y][j + pos.x] != 0)) {
                    return true;
                }
            }
        }

        return false;
    }
    drawField(){
        const ROWS = this.props.size.i;

        var {field, player} = this.state;
        var entityList = [];
        var material;

        field.forEach((row, rowIndex) => {
            entityList.push(row.map((elem, columnIndex) => {
                if (elem != 0) {
                    material = "color: " + FigureHelper.getFigureColor(elem);
                    return (<BasicSquare
                        material={material}
                        position={[columnIndex, ROWS - rowIndex,  0]}
                    />);
                }
            }));
        });

        player.matrix && player.matrix.forEach((row, rowIndex) => {
            row.forEach((elem, columnIndex)=> {
                if (elem != 0 ) {
                    var color = "color: " + FigureHelper.getFigureColor(elem);
                    entityList[player.pos.y + rowIndex][player.pos.x + columnIndex] = (
                        <BasicSquare
                            material={color}
                            position={[player.pos.x + columnIndex, ROWS - player.pos.y - rowIndex, 0]}
                            onClick={this.rotate.bind(this)}
                        />)
                }
            })
        });

        return entityList;
    }
    initKeyboardControlls(){
        window.addEventListener('keydown', this.moveHandler.bind(this), false);
    }
    moveHandler(event){
        const {code} = event;
        var moveTo;
        if (code == "KeyD" || code == "ArrowRight") {
            moveTo = "right";
        }
        else if (code == "KeyA" || code == "ArrowLeft"){
            moveTo = "left";
        }
        else if (code == "KeyS" || code == "ArrowDown"){
            moveTo = "down";
        }
        else {
            return;
        }

        var player = DeepCopy(this.state.player);

        switch (moveTo){
            case "right":
                player.pos.x++;
                break;
            case "left":
                player.pos.x--;
                break;
            case "down":
                player.pos.y++;
                break;
        }

        if (!this.isCollide(player)) {
            this.setState({player: player});
        }
    }
    render () {
        return (
            <div>
                <Scene antialias="true"
                       fog="type: linear; color: #fdfdea; far: 50; near: 0"
                       inspector="url: https://aframe.io/aframe-inspector/dist/aframe-inspector.js"
                       vr-mode-ui="enabled: true"
                       onLoaded={()=>{console.log("loaded")}}>
                    <a-sky color="#AAB" />
                    <Camera wasd-controls="enabled:false;">
                        {!this.state.isStarted && <Hint value="To start the game, (try to) press the start button"/>}
                        <Cursor/>
                    </Camera>
                    {this.state.isStarted && <Entity primitive="a-sound" sound={{src: "./theme.mp3", autoplay: true, loop: true}} />}

                    <GameField size={this.props.size} position={[0.5, 0.5, -10.5]} color="#c3efff"/>

                    {this.state.isStarted && <Score score={this.state.player.score}/>}

                    <Entity position={[-5, -10, -10]}> {this.drawField()} </Entity>

                    <Entity position={[0, 1.5, -5]}> {!this.state.isStarted && <StartBtn clickHandler={this.startGame}/>} </Entity>
                </Scene>

                <HtmlContainer msg={"Hello it's me"}/>
            </div>
        );
    }
}

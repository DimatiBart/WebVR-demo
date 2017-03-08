import 'aframe';
import 'aframe-animation-component';
import 'aframe-html-shader';
import React from 'react';
import "array.prototype.fill";
import {Entity, Scene} from 'aframe-react';

import Camera from "./components/Camera.jsx";
import ArrayRotator from "./utils/ArrayRotator";
import BasicCube from "./components/BasicCube.jsx";
import Hint from "./components/Hint.jsx";
import Cursor from "./components/Cursor.jsx";
import FigureProvider from "./utils/FigureProvider";
import HtmlContainer from "./components/HtmlContainer.jsx";
import DeepCopy from './utils/DeepCopy';
import FieldBackground from './components/FieldBackground.jsx';
import StartBtn from './components/StartBtn.jsx';
import Score from './components/Score.jsx';
import "./styles.less";

export class VRScene extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			player: {
				pos: {x: 0, y: 0},
				matrix: null,
				score: null,
			},
			field: [],
			isStarted: false,
			intervalId: null,
			intervalValue: null
		};
		this.initKeyboardControlls();
		this.startGame = this.startGame.bind(this);
	}

	startGame() {
		const initialInterval = 1000;
		var player = DeepCopy(this.state.player);

		player.score = 0;

		this.initField();
		this.initNewFigure(player);

		var id = setInterval(() => {
			this.dropPlayer();
		}, initialInterval);

		this.setState({
			isStarted: true,
			intervalId: id,
			player: player,
			intervalValue: initialInterval
		});
	}

	endGame(player) {
		var {intervalId} = this.state;
		clearInterval(intervalId);

		player.matrix = null;

		this.setState({isStarted: false, intervalId: null});
	}

	dropPlayer() {
		var player = DeepCopy(this.state.player);
		player.pos.y++;

		if (this.isCollide(player)) {
			player.pos.y--;
			this.merge();
			this.checkAndRemoveFullRows(player);
			this.initNewFigure(player);
		}

		this.setState({player});
	}

	initNewFigure(player) {
		player.matrix = FigureProvider.getFigure();
		player.pos.y = 0;
		player.pos.x = Math.floor(this.props.size.j / 2) - Math.floor(player.matrix.length / 2);

		if (this.isCollide(player)) {
			this.endGame(player);
		}
	}

	checkAndRemoveFullRows(player) {
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

		if (rowCount) {
			this.setState({field});
		}
	}

	initField() {
		const [ROWS, COLUMNS] = [this.props.size.i, this.props.size.j];
		var clearField = [];

		for (var i = 0; i < ROWS; i++) {
			clearField.push(new Array(COLUMNS).fill(0));
		}

		this.setState({field: clearField});
	}

	rotate() {
		var player = DeepCopy(this.state.player);
		var offset = 1;
		const originalPos = player.pos.x;

		player.matrix = ArrayRotator.rotateClockwise(player.matrix);

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

	isCollide(player) {
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

	drawField() {
		const ROWS = this.props.size.i;
		var {field, player} = this.state;
		var entityList = [];
		var material;

		field.forEach((row, rowIndex) => {
			entityList.push(row.map((elem, columnIndex) => {
				if (elem != 0) {
					material = "color: " + FigureProvider.getFigureColor(elem);
					return (<BasicCube
						material={material}
						position={[columnIndex, ROWS - rowIndex, 0]}
					/>);
				}
			}));
		});

		player.matrix && player.matrix.forEach((row, rowIndex) => {
			row.forEach((elem, columnIndex) => {
				if (elem != 0) {
					var color = "color: " + FigureProvider.getFigureColor(elem);
					entityList[player.pos.y + rowIndex][player.pos.x + columnIndex] = (
						<BasicCube
							material={color}
							position={[player.pos.x + columnIndex, ROWS - player.pos.y - rowIndex, 0]}
							onClick={this.rotate.bind(this)}
						/>)
				}
			})
		});

		return entityList;
	}

	initKeyboardControlls() {
		window.addEventListener('keydown', this.moveHandler.bind(this), false);
	}

	moveHandler(event) {
		if (!this.state.isStarted){
			return;
		}

		const keyMap = {
			KeyD: "right",
			ArrowRight: "right",
			KeyA: "left",
			ArrowLeft: "left",
			KeyS: "down",
			ArrowDown: "down"
		};

		const {code} = event;
		var moveTo = keyMap[code];

		if (!moveTo) {
			return;
		}

		var player = DeepCopy(this.state.player);

		switch (moveTo) {
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

	render() {
		return (
			<div>
				<Scene antialias="true"
							 fog={{type: "linear", color: "#fdfdea", far: 50, near: 0}}
							 inspector="url: https://aframe.io/aframe-inspector/dist/aframe-inspector.js"
							 vr-mode-ui="enabled: true"
							 onLoaded={() => {
								 console.log("loaded");
							 }}>
					<a-sky color="#AAB"/>
					<Camera wasd-controls="enabled:false;">
						{!this.state.isStarted && <Hint score={this.state.player.score} value="To start the game, (try to) press the start button"/>}
						<Cursor/>
					</Camera>
					{this.state.isStarted && <Entity primitive="a-sound" sound={{src: "./theme.mp3", autoplay: true, loop: true}}/>}

					<FieldBackground size={this.props.size} position={[0.5, 0.5, -10.5]} color="#c3efff"/>

					{this.state.isStarted && <Score score={this.state.player.score}/>}

					<Entity position={[-5, -10, -10]}> {this.drawField()} </Entity>

					<Entity position={[0, 1.5, -5]}>
						{!this.state.isStarted && <StartBtn clickHandler={this.startGame}/>}
					</Entity>
				</Scene>

				<HtmlContainer msg={"Hello it's me"}/>
			</div>
		);
	}
}

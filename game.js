//Frog Hop
const W = 800;
const H = 800;

//color dictionary to easily change and referance colors
const COLORS = {
    water:     0x4ba8d4,
    lily:      0x2d8a3e,
    lilyDark:  0x1f6029,
    log:       0x8b5a2b,
    logDark:   0x5a3a1a,
    arrow:     0xffeb3b,
    grass:     0x4a8c3a,
    grassDark: 0x2d6020
};

class IntroScene extends Phaser.Scene {
    constructor() { super({ key: 'IntroScene' }); }

    preload() {
        this.load.image('frog', 'frog.png');
    }

    create() {
        this.cameras.main.setBackgroundColor(COLORS.water);
    //title
    this.add.text(W / 2, 160, 'Frog Hop!', {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '92px', color: '#ffffff',
    stroke: '#1f6029', strokeThickness: 10
    }).setOrigin(0.5);


    //frog graphic
    const titleFrog = this.add.image(W / 2, 340, 'frog').setScale(1.4);
    this.tweens.add({
    targets: titleFrog, y: 320,
    duration: 700, yoyo: true, repeat: -1,
    ease: 'Sine.easeInOut'
    });

    //play button
    const btnX = W / 2, btnY = 540;
    const btn = this.add.rectangle(btnX, btnY, 240, 80, 0xffffff)
    .setStrokeStyle(6, COLORS.lilyDark)
    .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(btnX, btnY, 'Play', {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '46px', color: '#1f6029'
    }).setOrigin(0.5);

    //button interactions
    btn.on('pointerover', () => {
        btn.setFillStyle(0xddffdd); btn.setScale(1.05); 
        btnText.setScale(1.05); 
    });
    btn.on('pointerout',  () => { 
        btn.setFillStyle(0xffffff); btn.setScale(1);    
        btnText.setScale(1); 
    });
    btn.on('pointerdown', () => this.scene.start('LevelScene', { level: 1 }
    ));

    //instructions
    this.add.text(W / 2, 640,
    'Drag from the frog to aim — release to hop!', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px', color: '#ffffff',
    stroke: '#1f6029', strokeThickness: 3
    }).setOrigin(0.5);
    }
}

//functions to create game objects
function makeLilyPad(scene, x, y) {
    return scene.add.circle(x, y, 38, COLORS.lily).setStrokeStyle(3, COLORS.lilyDark);
}
function makeLog(scene, x, y) {
    return scene.add.rectangle(x, y, 140, 36, COLORS.log).setStrokeStyle(3, COLORS.logDark);
}
//level scene
class LevelScene extends Phaser.Scene {
    constructor() { super({ key: 'LevelScene' }); }

    //data vars
    init(data) {
        this.levelNum = data.level || 1; //level num
        this.deaths = 0; //death count
        this.startTime = 0; //time tracking
        this.lastTime = 0; //store previous update time
        this.platforms = []; //platform array
        this.currentPlatform = null; //track if frog on platform
        this.isAiming = false; //track if player is aiming
        this.isHopping = false; //track if frog is midair
        this.canMove = true; //true when frog not jumping
        this.hopDir = null; //stores hop direction
    }

    preload() {
        this.load.image('frog', 'frog.png');
    }

    create() {
        this.startTime = this.time.now; //start timer
        this.cameras.main.setBackgroundColor(COLORS.water);

        //start zone
        const startZoneH = 260;
        this.startZoneTopY = H - startZoneH;
        const startZone = this.add.rectangle(W / 2, H - startZoneH / 2,
            W, startZoneH, COLORS.grass);
        startZone.setStrokeStyle(3, COLORS.grassDark);
        this.add.text(W / 2, H - 30, 'START', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        //goal zone 
        const goalZone = this.add.rectangle(W / 2, 30,
            W, 60, COLORS.grass);
        goalZone.setStrokeStyle(3, COLORS.grassDark);
        this.add.text(W / 2, 30, 'GOAL', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px', color: '#ffff66',
            stroke: '#1f6029', strokeThickness: 4
        }).setOrigin(0.5);

        //build platforms
        this.setupLevel();

        //frog start pos
        this.startX = W / 2;
        this.startY = 620;


        //frog
        this.frog = this.add.image(this.startX, this.startY, 'frog');
        this.frog.setScale(0.5);
        
        //arrow graphic
        this.arrowGraphics = this.add.graphics();

        //input info
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup',   this.onPointerUp,   this);

        //gui info
        this.deathText = this.add.text(15, 75, 'Deaths: 0', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '20px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        });
        this.timeText = this.add.text(15, 102, 'Time: 0s', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '20px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        });
        this.add.text(W - 15, 75, `Level ${this.levelNum}`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '24px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0);

        //level creation
    
    }


    setupLevel() {
        //3 different level layouts for the 3 levels of the game
        if (this.levelNum === 1) {
            //L1 create 5 lily pads for level 1
            [
                { x: 300, y: 470 },
                { x: 510, y: 380 },
                { x: 300, y: 290 },
                { x: 510, y: 200 },
                { x: 350, y: 120 }
            ].forEach(p => this.addPlatform(p.x, p.y, 'lily', 0));

        } else if (this.levelNum === 2) {
            //L2 rows of moving lily pads
            [
                { y: 470, count: 2, speed:  60 },
                { y: 380, count: 3, speed: -55 },
                { y: 290, count: 2, speed:  70 },
                { y: 200, count: 3, speed: -60 },
                { y: 110, count: 2, speed:  65 }
            ].forEach(row => {
                const spacing = W / row.count;
                for (let i = 0; i < row.count; i++) {
                    const x = i * spacing + spacing / 2;
                    this.addPlatform(x, row.y, 'lily', row.speed);
                }
            });

        } else {
            //L3 mix of lily pads, and logs
            this.addPlatform(180, 470, 'lily',  55);
            this.addPlatform(580, 470, 'lily',  55);
            this.addPlatform(280, 385, 'lily',  -65);
            this.addPlatform(620, 385, 'lily',  -65);
            this.addPlatform(180, 295, 'log',   85);
            this.addPlatform(530, 295, 'log',   85);
            this.addPlatform(220, 210, 'lily',  -90);
            this.addPlatform(580, 210, 'lily',  -90);
            this.addPlatform(320, 125, 'log',  -75);
            this.addPlatform(660, 125, 'log',  -75);
        }
    }


    //calls respective helper function to create platform
    addPlatform(x, y, type, vx) {
        let shape, w, h, radius;
        if (type === 'lily') {
            shape = makeLilyPad(this, x, y);
            w = 76; h = 76; radius = 38;
        } else { //log
            shape = makeLog(this, x, y);
            w = 140; h = 36; radius = null;
        }
        this.platforms.push({ shape, x, y, w, h, type, vx, radius});
    }

    //input handlers
    onPointerDown(pointer) {
        if (!this.canMove || this.isHopping) return; //check if player can aim
        const dist = Phaser.Math.Distance.Between(
            pointer.x, pointer.y, this.frog.x, this.frog.y); //calc distance from frog to mouse pointer
        if (dist < 100) {
            this.isAiming = true; //start aiming if close enough to frog
        }
    }

    onPointerMove(pointer) {
        if (!this.isAiming) return; 
        const dragX = pointer.x - this.frog.x; //flip drag distance since direction frog travels is opposite of drag
        const dragY = pointer.y - this.frog.y;
        let hopX = -dragX;
        let hopY = -dragY; 
        const len = Math.sqrt(hopX * hopX + hopY * hopY); //find hop length
        const maxLen = 280;
        if (len > maxLen) {
            hopX = (hopX / len) * maxLen;
            hopY = (hopY / len) * maxLen;
        }
        this.hopDir = { x: hopX, y: hopY };
        this.drawArrow(); //update arrow graphic to show hop direction and strength
    }

    onPointerUp() {
        if (!this.isAiming) return;
        this.isAiming = false;
        this.arrowGraphics.clear(); 
        if (!this.hopDir) return;
        const len = Math.sqrt(this.hopDir.x ** 2 + this.hopDir.y ** 2); 
        if (len < 25) { this.hopDir = null; return; } //minimum hop ammount to prevent accidental hops
        this.hop(this.hopDir);
        this.hopDir = null;
    }

    drawArrow() { //show hop direction
        this.arrowGraphics.clear();
        if (!this.hopDir) return;
        const len = Math.sqrt(this.hopDir.x ** 2 + this.hopDir.y ** 2);
        if (len < 15) return;

        const sx = this.frog.x;
        const sy = this.frog.y;
        const ex = sx + this.hopDir.x;
        const ey = sy + this.hopDir.y;

        this.arrowGraphics.lineStyle(5, COLORS.arrow, 1);
        this.arrowGraphics.beginPath();
        this.arrowGraphics.moveTo(sx, sy);
        this.arrowGraphics.lineTo(ex, ey);
        this.arrowGraphics.strokePath();
    }

    //hop physics
    hop(vec) {
        this.isHopping = true; //reset platform and movement vars
        this.canMove = false;
        this.currentPlatform = null;

        const targetX = this.frog.x + vec.x; //calculate target based on hop vector
        const targetY = this.frog.y + vec.y;

        //rotate frog to face direction of travel (sprite faces up by default)
        this.frog.setRotation(Math.atan2(vec.y, vec.x) + Math.PI / 2);

        const duration = 600;

        //tween frog based on calculation
        this.tweens.add({
            targets: this.frog,
            x: targetX, y: targetY,
            duration, ease: 'Sine.easeOut'
        });

        //add a tween to make the frog look like its hopping
        this.tweens.add({
            targets: this.frog,
            scale: 0.75,
            duration: duration / 2,
            yoyo: true, ease: 'Sine.easeOut',
            onComplete: () => {
                this.frog.setScale(0.5);
                this.checkLanding(vec);
            }
        });
    }

    checkLanding(vec) {
        //check if langed in goal zone
        if (this.frog.y < 60) { this.levelComplete(); return; }

        //landed if landed at start
        if (this.frog.y > this.startZoneTopY) {
            this.frog.setRotation(0);
            this.isHopping = false;
            this.canMove = true;
            return;
        }
        //check if landed on platform
        const landed = this.findPlatformAt(this.frog.x, this.frog.y);
        if (landed) {
                this.currentPlatform = landed;
                this.frog.setRotation(0);
                this.isHopping = false;
                this.canMove = true;
        } else {
            //not landed anywhere, death
            this.die();
        }
    }

    //set function for checking if frog landed on a platform
    findPlatformAt(x, y) {
        for (const p of this.platforms) {
            if (p.type === 'log') {
                //if log check if frog is inside log hitbox
                if (Math.abs(x - p.x) < p.w / 2 - 8 &&
                    Math.abs(y - p.y) < p.h / 2 + 6) {
                    return p;
                }
            } else {
                //if lilypad check if frog is within radius of pad center
                const dx = x - p.x;
                const dy = y - p.y;
                if (dx * dx + dy * dy < p.radius * p.radius) return p;
            }
        }
        return null;
    }
    //called when frog dies
    die() {
        this.deaths++; //count deaths per level
        this.deathText.setText('Deaths: ' + this.deaths);

        //create splash effect
        const splash = this.add.circle(this.frog.x, this.frog.y, 12, 0xffffff, 0.85);
        splash.setStrokeStyle(2, 0xffffff);
        this.tweens.add({
            targets: [splash],
            scale: 4, alpha: 0,
            duration: 600,
            onComplete: () => { splash.destroy();}
        });
        //reset frog
        this.frog.setVisible(false);
        this.frog.setRotation(0);
        //short delay then reset position
        this.time.delayedCall(700, () => {
            this.frog.setPosition(this.startX, this.startY);
            this.frog.setVisible(true);
            this.currentPlatform = null;
            this.isHopping = false;
            this.canMove = true;
        });
    }

    levelComplete() {
        const elapsed = Math.floor((this.time.now - this.startTime) / 1000);
        this.canMove = false;
        this.isHopping = true;

        //celebration bounce for finishing a level
        this.tweens.add({
            targets: this.frog,
            scale: 0.7,
            duration: 200,
            yoyo: true, repeat: 2,
            onComplete: () => {
                this.scene.start('SummaryScene', { //update level and pass level stats to summary scene
                    level: this.levelNum,
                    deaths: this.deaths,
                    time: elapsed
                });
            }
        });
    }

    update(time) {
        //timer
        if (this.canMove && !this.isHopping) {
            const elapsed = Math.floor((this.time.now - this.startTime) / 1000);
            this.timeText.setText('Time: ' + elapsed + 's');
        }

        //move platforms and wrap around the screen
        let dt = 0;
        if (this.lastTime > 0) {
            dt = (time - this.lastTime) / 1000;
        }
        this.lastTime = time;
        for (const p of this.platforms) {
            if (p.vx !== 0) {
                p.x += p.vx * dt;
                const halfW = p.w / 2 + 20;
                if (p.vx > 0 && p.x > W + halfW) p.x = -halfW;
                else if (p.vx < 0 && p.x < -halfW)        p.x = W + halfW;
                p.shape.setPosition(p.x, p.y);
            }
        }

        //frog rides current platform
        if (this.currentPlatform && !this.isHopping && this.canMove) {
            const v = this.currentPlatform.vx * dt;
            this.frog.x += v;
            //frog wraps around screen
            if (this.frog.x > W + 30) { this.frog.x -= W + 60 }
            if (this.frog.x < -30) { this.frog.x += W + 60;}
        } else if (!this.isHopping) {
        }
    }
}
class SummaryScene extends Phaser.Scene {
    constructor() { super({ key: 'SummaryScene' }); }

    //create scene vars from passed data
    init(data) {
        this.completedLevel = data.level;
        this.deaths = data.deaths;
        this.elapsedTime = data.time;
    }

    preload() {
        this.load.image('frog', 'frog.png');
    }

    create() {
        this.cameras.main.setBackgroundColor(COLORS.water);

        //panel
        const panel = this.add.rectangle(W / 2, H / 2 - 30,
            520, 460, 0xffffff, 0.96);
        panel.setStrokeStyle(6, COLORS.lilyDark);

        //header
        this.add.text(W / 2, 200, `Level ${this.completedLevel}`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '38px', color: '#1f6029'
        }).setOrigin(0.5);
        this.add.text(W / 2, 240, 'Summary', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '22px', color: '#444'
        }).setOrigin(0.5);

        //decorative frogs
        this.add.image(W / 2 - 210, 205, 'frog').setScale(0.9);
        this.add.image(W / 2 + 210, 205, 'frog').setScale(0.9);

        //stats
        this.add.text(W / 2, 310, `Level ${this.completedLevel} Complete!`, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '34px', color: '#1f6029'
        }).setOrigin(0.5);
        this.add.text(W / 2, 370, `Deaths: ${this.deaths}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px', color: '#000'
        }).setOrigin(0.5);
        this.add.text(W / 2, 410, `Time: ${this.elapsedTime}s`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '28px', color: '#000'
        }).setOrigin(0.5);

        const isLast = this.completedLevel === 3;

        //end scene
        if (isLast) {
            this.add.text(W / 2, 470, 'Thanks for Playing!', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '36px', color: '#ff6b35',
                stroke: '#ffffff', strokeThickness: 4
            }).setOrigin(0.5);

            const btn = this.add.rectangle(W / 2, 540, 220, 64, 0xffffff)
                .setStrokeStyle(5, COLORS.lilyDark)
                .setInteractive({ useHandCursor: true });
            const btnText = this.add.text(W / 2, 540, 'Play Again', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '26px', color: '#1f6029'
            }).setOrigin(0.5);
            btn.on('pointerover', () => { btn.setFillStyle(0xddffdd); btn.setScale(1.05); btnText.setScale(1.05); });
            btn.on('pointerout',  () => { btn.setFillStyle(0xffffff); btn.setScale(1);    btnText.setScale(1); });
            btn.on('pointerdown', () => this.scene.start('IntroScene'));

        } else {
            //next level button
            const btn = this.add.rectangle(W / 2, 490, 240, 70, 0xffffff)
                .setStrokeStyle(5, COLORS.lilyDark)
                .setInteractive({ useHandCursor: true });
            const btnText = this.add.text(W / 2, 490, 'Next Level', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '28px', color: '#1f6029'
            }).setOrigin(0.5);
            btn.on('pointerover', () => { btn.setFillStyle(0xddffdd); btn.setScale(1.05); btnText.setScale(1.05); });
            btn.on('pointerout',  () => { btn.setFillStyle(0xffffff); btn.setScale(1);    btnText.setScale(1); });
            btn.on('pointerdown', () => {
                this.scene.start('LevelScene', { level: this.completedLevel + 1 });
            });
        }
    }
}

//game config
const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'root',
    backgroundColor: '#4ba8d4',
    scene: [IntroScene, LevelScene, SummaryScene]
};

const game = new Phaser.Game(config);
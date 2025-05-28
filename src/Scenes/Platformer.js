class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 200;
        this.DRAG = 450;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -420;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        
        // State variables for interactions
        this.playerCanMove = true;
        this.gameOverActive = false;
    }

    create() {
        // Load and create sound effects
        this.sounds = {
            jump: this.sound.add('jump', { volume: 0.3 }),
            lose: this.sound.add('lose', { volume: 0.5 }),
            win: this.sound.add('win', { volume: 0.4 }),
            pickupCoin: this.sound.add('pickupCoin', { volume: 0.4 })
        };

   
        const gameHeight = 720; 
        const bg1Scale = gameHeight / 160; 
        this.bg1 = this.add.tileSprite(0, 0, 272 * bg1Scale * 3, gameHeight, 'bg1'); // 3 tiles wide
        this.bg1.setOrigin(0, 0);
        this.bg1.setScale(bg1Scale);
        this.bg1.setScrollFactor(0.1);
        this.bg1.setDepth(-4);

      
        const bg2Scale = gameHeight / 142;
        this.bg2 = this.add.tileSprite(0, 0, 213 * bg2Scale * 3, gameHeight, 'bg2'); 
        this.bg2.setOrigin(0, 0);
        this.bg2.setScale(bg2Scale);
        this.bg2.setScrollFactor(0.25);
        this.bg2.setDepth(-3);

       
        const bg3Scale = gameHeight / 150;
        this.bg3 = this.add.tileSprite(0, 0, 272 * bg3Scale * 2.5, gameHeight, 'bg3'); 
        this.bg3.setOrigin(0, 0);
        this.bg3.setScale(bg3Scale);
        this.bg3.setScrollFactor(0.5);
        this.bg3.setDepth(-2);

       
        const bg4Scale = gameHeight / 104; 
        this.bg4 = this.add.tileSprite(0, 0, 272 * bg4Scale * 2, gameHeight, 'bg4'); 
        this.bg4.setOrigin(0, 0);
        this.bg4.setScale(bg4Scale);
        this.bg4.setScrollFactor(0.75);
        this.bg4.setDepth(-1);

        this.map = this.add.tilemap("platformerlevel.", 18, 18, 160, 40);  
      
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_tiles");
        this.foregroundLayer = this.map.createLayer("foreground", this.tileset, 0, 0);
        this.foregroundLayer2 = this.map.createLayer("foreground0.5", this.tileset, 0, 0);

        this.groundLayer = this.map.createLayer("groundnplats", this.tileset, 0, 0);

        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Create water animation
        this.anims.create({
            key: 'water',
            frames: [ 
                { key: 'tilemap_sheet', frame: 13 },
                { key: 'tilemap_sheet', frame: 29 }
            ],
            frameRate: 6,
            repeat: -1
        });

        //chest vfx
        my.vfx.chests = this.add.particles(0,0,"kenny-particles",{
            frame: ['star_01.png','star_02.png'],
            random:true,
            scale: {start:0.1, end:0},
            maxAliveParticles: 2,
            lifespan: 500,
            gravityY: -400,
            alpha: {start: 1,end: 0},
        });
        my.vfx.chests.stop();
        
        //water splash
        my.vfx.water = this.add.particles(0,0,"kenny-particles",{
            frame: ['circle_01.png'],
            random:true,
            scale: {start:0.1, end:0},
            maxAliveParticles: 10,
            lifespan: 500,
            gravityY: -400,
            alpha: {start: 1,end: 0},
            speed: 50,
            angle: { min: 240, max: 300 },tint: 0x0099ff,
        });
        my.vfx.water.stop();

        //walking dust
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png','smoke_03.png','smoke_04.png'],
            random: true,
            scale: {start: 0.01, end: 0.1},
            maxAliveParticles: 10,
            lifespan: 350,
            gravityY: -100,
            alpha: {start: 1, end: 0.1}, 
            angle: { min: 170, max: 180}
        });
        my.vfx.walking.stop();

        this.groundLayer.forEachTile(tile => {
            if (tile && tile.properties && tile.properties.water) {
                tile.alpha = 0;
                
                
                const water = this.add.sprite(tile.pixelX + 9, tile.pixelY + 9, 'tilemap_sheet');
                water.setOrigin(0.5, 0.5);
                water.play('water');
            }
        });

        // Create chests from Objects layer in tilemap
        this.chests = this.map.createFromObjects("Objects", {
            name: "chests",
            key: "tilemap_sheet",
            frame: 60
        });

        this.physics.world.enable(this.chests, Phaser.Physics.Arcade.STATIC_BODY);


        this.chestGroup = this.add.group(this.chests);
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water === true;
        });

        this.winZone = {
            x: 2835,  
            y: 474,   
            width: 18, 
            height: 18 
        };

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        
        // Set world bounds first, then enable collision
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        
        // chest collision handler
        this.physics.add.overlap(my.sprite.player, this.chestGroup, (obj1, obj2) => {
            const chestX = obj2.x;
            const chestY = obj2.y;

            obj2.destroy(); 
            
            // Play pickup sound
            this.sounds.pickupCoin.play();
            
            my.vfx.chests.setPosition(chestX,chestY);
            my.vfx.chests.start();

            this.time.delayedCall(100, () => {
                my.vfx.chests.stop();
            });
        });

        // set up Phaser-provided cursor key input
        this.cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            this.physics.world.debugGraphic.clear();
        }, this);

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        // Initialize text objects (hidden initially)
        this.gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, '', {
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

        this.restartText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Press R to Restart', {
            fontSize: '24px',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
    }

    update() {
        // Don't process movement if player can't move
        if (!this.playerCanMove) {
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
                this.scene.restart();
            }
            return;
        }

        if(this.cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

           
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(this.cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            // Play jump sound
            this.sounds.jump.play();
        }

        // Check for water collision
        this.checkWaterCollision();
        
        // Check for win condition
        this.checkWinCondition();

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }

    // Function to check for water collision and create splash effects
    checkWaterCollision() {
        const currentTime = this.time.now;
        
        if (currentTime - this.lastWaterSplashTime < 150) {
            return;
        }
        
        // Convert player position to tile position
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2);
        
        // Get the tile at player's position
        const tile = this.groundLayer.getTileAt(playerTileX, playerTileY);
        
        // Check if tile exists and has water property (even though it's invisible)
        if (tile && tile.properties && tile.properties.water) {
            // Stop player movement immediately
            this.playerCanMove = false;
            my.sprite.player.setVelocity(0, 0);
            my.sprite.player.setAcceleration(0, 0);
            my.vfx.walking.stop();
            
            // Create water splash effect
            const waterX = tile.pixelX + tile.width / 2;
            const waterY = tile.pixelY;
         
            my.vfx.water.setPosition(waterX, waterY);
            my.vfx.water.start();
            
            // Play lose sound
            this.sounds.lose.play();
            
            this.time.delayedCall(150, () => {
                my.vfx.water.stop();
            });
            
            // Tween player up slightly
            this.tweens.add({
                targets: my.sprite.player,
                y: my.sprite.player.y - 20,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    // Show game over text
                    this.showWaterGameOver();
                }
            });
            
            this.lastWaterSplashTime = currentTime;
        }
    }

    // Function to check for win condition based on player position
    checkWinCondition() {
        // Check if player is within the win zone
        if (my.sprite.player.x >= this.winZone.x && 
            my.sprite.player.x <= this.winZone.x + this.winZone.width &&
            my.sprite.player.y >= this.winZone.y && 
            my.sprite.player.y <= this.winZone.y + this.winZone.height) {
            
            // Stop player movement
            this.playerCanMove = false;
            my.sprite.player.setVelocity(0, 0);
            my.sprite.player.setAcceleration(0, 0);
            my.vfx.walking.stop();
            
            // Show win message
            this.showWinCondition();
        }
    }

 
    showWaterGameOver() {
        this.gameOverText.setText('Game Over!\n');
        this.gameOverText.setVisible(true);
        this.restartText.setText('Press R to Restart');
        this.restartText.setVisible(true);
        this.gameOverActive = false; 
    }

    // Show win condition UI
    showWinCondition() {
        this.sounds.win.play();  
        this.gameOverText.setText('Level Complete!\nWell Done!');
        this.gameOverText.setVisible(true);
        this.restartText.setText('Press R to Restart');
        this.restartText.setVisible(true);
        this.gameOverActive = true; 
    }

    // Hide game over UI
    hideGameOverUI() {
        this.gameOverText.setVisible(false);
        this.restartText.setVisible(false);
    }
}
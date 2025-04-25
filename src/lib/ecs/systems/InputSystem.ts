import { System } from '../System';
import { InputComponent } from '../components/GameComponents';
import type { Entity } from '../Entity';

/**
 * InputSystem handles keyboard input and updates an InputComponent
 * This centralizes all input handling in one system
 */
export class InputSystem extends System {
  private keyMap: Map<string, boolean> = new Map();
  private inputEntity: Entity | null = null;

  constructor() {
    super([]);
    this.setupEventListeners();
  }

  initialize(): void {
    // Create an input entity if one doesn't exist
    const inputEntities = this.world.getEntitiesWith('Input');
    if (inputEntities.length === 0) {
      this.inputEntity = this.world.createEntity();
      this.world.addComponent(this.inputEntity, new InputComponent());
    } else {
      this.inputEntity = inputEntities[0];
    }
  }

  update(deltaTime: number): void {
    if (!this.inputEntity) return;
    
    const inputComponent = this.world.getComponent<InputComponent>(this.inputEntity, 'Input');
    if (!inputComponent) return;

    // Update the InputComponent based on key state
    inputComponent.leftPressed = this.keyMap.get('ArrowLeft') || this.keyMap.get('a') || false;
    inputComponent.rightPressed = this.keyMap.get('ArrowRight') || this.keyMap.get('d') || false;
    inputComponent.upPressed = this.keyMap.get('ArrowUp') || this.keyMap.get('w') || false;
    inputComponent.spacePressed = this.keyMap.get(' ') || false;
    
    // P and R are handled as one-time triggers to avoid repeated toggling
    if (this.keyMap.get('p')) {
      inputComponent.justPaused = true;
      this.keyMap.set('p', false); // Reset immediately to prevent multiple triggers
    }
    
    if (this.keyMap.get('r')) {
      inputComponent.justRestarted = true;
      this.keyMap.set('r', false); // Reset immediately to prevent multiple triggers
    }

    // Trigger single shot if up key was just pressed
    if (inputComponent.upPressed) {
      inputComponent.singleShotTriggered = true;
    }
  }

  private setupEventListeners(): void {
    // Set up keydown listener
    window.addEventListener('keydown', (event) => {
      this.keyMap.set(event.key, true);
    });

    // Set up keyup listener
    window.addEventListener('keyup', (event) => {
      this.keyMap.set(event.key, false);
    });
  }

  /**
   * Called by Game class to reset one-time triggers
   */
  resetTriggers(): void {
    if (!this.inputEntity) return;
    
    const inputComponent = this.world.getComponent<InputComponent>(this.inputEntity, 'Input');
    if (inputComponent) {
      inputComponent.resetTriggers();
    }
  }
}
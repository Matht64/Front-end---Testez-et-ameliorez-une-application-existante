
describe('Registration page', () => {

  beforeEach(() => {
    cy.visit('/register', {
      onBeforeLoad: (window) => {
        window.localStorage.removeItem('token');
      }
    });
  });

  it('should display the registration form', () => {
    cy.get('input[formControlName="firstName"]')
      .should('be.visible');

    cy.get('input[formControlName="lastName"]')
      .should('be.visible');

    cy.get('input[formControlName="login"]')
      .should('be.visible');

    cy.get('input[formControlName="password"]')
      .should('be.visible');

    cy.contains('button', 'Register')
      .should('be.visible');
  });

  it('should display validation errors when submitting an empty form', () => {
    cy.contains('button', 'Register').click();

    cy.contains('First Name is required')
      .should('be.visible');

    cy.contains('Last Name is required')
      .should('be.visible');

    cy.contains('Login is required')
      .should('be.visible');

    cy.contains('password is required')
      .should('be.visible');
  });

  it('should navigate to login when clicking Back to login', () => {
    cy.contains('Back to login').click();

    cy.url().should('include', '/login');
  });

});

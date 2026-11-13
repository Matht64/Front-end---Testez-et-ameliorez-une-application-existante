
describe('Login page', () => {

  beforeEach(() => {
    cy.visit('/login', {
      onBeforeLoad: (window) => {
        window.localStorage.removeItem('token');
      }
    });
  });

  it('should display the login form', () => {
    cy.get('#login').should('be.visible');
    cy.get('#password').should('be.visible');

    cy.contains('button', 'Login').should('be.visible');
  });

  it('should display validation errors when submitting an empty form', () => {
    cy.get('button[type="submit"]').click();

    cy.contains('Login is required.').should('be.visible');
    cy.contains('Password is required.').should('be.visible');
  });

});

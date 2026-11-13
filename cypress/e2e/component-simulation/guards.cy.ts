
function createTestToken(): string {
    const header = btoa(JSON.stringify({
        alg: 'HS256',
        typ: 'JWT'
    }));

    const payload = btoa(JSON.stringify({
        sub: 'cypress-user',
        exp: Math.floor(Date.now() / 1000) + 3600
    }));

    return `${header}.${payload}.test-signature`;
}



describe('Authentication guards', () => {

    beforeEach(() => {
        cy.visit('/login', {
            onBeforeLoad: (window) => {
                window.localStorage.removeItem('token');
            }
        });
    });

    it('should redirect unauthenticated users to login', () => {
        cy.visit('/students');

        cy.url().should('include', '/login');

        cy.url().should('include', 'returnUrl');
    });

    it('should redirect unauthenticated users from home to login', () => {
        cy.visit('/');

        cy.url().should('include', '/login');
    });


    it('should redirect authenticated users from login to students', () => {
        cy.visit('/login', {
            onBeforeLoad: (window) => {
                window.localStorage.setItem('token', createTestToken());
            }
        });

        cy.url().should('include', '/students');
    });

    it('should redirect authenticated users from register to students', () => {
        cy.visit('/register', {
            onBeforeLoad: (window) => {
                window.localStorage.setItem('token', createTestToken());
            }
        });

        cy.url().should('include', '/students');
    });

    it('should redirect authenticated users from home to students', () => {
        cy.visit('/', {
            onBeforeLoad: (window) => {
                window.localStorage.setItem('token', createTestToken());
            }
        });

        cy.url().should('include', '/students');
    });


});

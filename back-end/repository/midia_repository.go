package repository

import "github.com/jmoiron/sqlx"

type MidiaRepository struct {
	connection *sqlx.DB
}

func NewMidiaRepository(connection *sqlx.DB) *MidiaRepository {
	return &MidiaRepository{
		connection: connection,
	}
}
func (repo MidiaRepository) UploadMidia( linkMidia string) error {
	const query = `INSERT INTO midia (linkmidia) VALUES ($1)`
	_, err := repo.connection.Exec(query, linkMidia)
	if err != nil {
		return err
	}
	return nil
}
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { MdDelete, MdApartment, MdArrowBack } from "react-icons/md";

export default function Floors() {
  const { blockId } = useParams();
  const navigate = useNavigate();
  const [floors, setFloors] = useState([]);

  useEffect(() => {
    API.get(`/floors/${blockId}`)
      .then(res => setFloors(res.data))
      .catch(err => console.error(err));
  }, [blockId]);

  return (
    <div className="min-h-screen bg-app">
      <header className="sticky top-0 z-30 bg-navbar text-white shadow">
        <div className="flex justify-between items-center px-4 sm:px-9 h-16">
          <h1 className="text-base sm:text-lg font-semibold">Block Floors</h1>
          <button onClick={() => navigate(-1)} className="bg-white/10 px-4 py-2 rounded text-sm">Back</button>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-card rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-4">Floors List</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-secondary">
                <tr>
                  <th className="p-3 text-left">Floor Number</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {floors.map(f => (
                  <tr key={f.id} className="border-t">
                    <td className="p-3 font-medium">Floor {f.floor_number}</td>
                    <td className="p-3 flex justify-end">
                      <Link to={`/superadmin/floor/${f.id}/flats`} className="icon-btn manage text-xl" title="Manage Flats">
                        <MdApartment />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
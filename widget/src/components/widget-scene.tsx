import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center, Text3D } from "@react-three/drei";
import { useWidgetStore } from "../widget-store";
import { styles } from "../widget-styles";

function SignContent() {
  const product = useWidgetStore((s) => s.product);
  const optionValues = useWidgetStore((s) => s.optionValues);

  if (!product) return null;

  const text = (optionValues.text as string) ?? product.name;
  const height = (optionValues.height as number) ?? 12;
  const scale = height / 12; // normalize to a reasonable size

  // For text-based products, render 3D text
  const category = product.category?.toLowerCase() ?? "";
  const isTextBased = category.includes("channel") || category.includes("letter") || category.includes("neon");

  if (isTextBased && text) {
    return (
      <Center>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={scale * 4}
          height={scale * 1.5}
          curveSegments={8}
          bevelEnabled
          bevelThickness={scale * 0.15}
          bevelSize={scale * 0.08}
          bevelSegments={3}
        >
          {text || "SIGN"}
          <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
        </Text3D>
      </Center>
    );
  }

  // For non-text products, render a placeholder box
  const w = ((optionValues.widthInches as number) ?? 48) / 12;
  const h = ((optionValues.heightInches as number) ?? 24) / 12;

  return (
    <Center>
      <mesh>
        <boxGeometry args={[w * 2, h * 2, 0.3]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.3} roughness={0.5} />
      </mesh>
    </Center>
  );
}

export function WidgetScene() {
  return (
    <div style={{ ...styles.viewport, width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 40 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 8]} intensity={1.2} />
        <directionalLight position={[-3, 4, 4]} intensity={0.4} />
        <Environment preset="studio" />
        <OrbitControls enablePan={false} />
        <SignContent />
      </Canvas>
    </div>
  );
}
